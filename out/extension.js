"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
function activate(context) {
    const provider = new AnnoyingDogViewProvider(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('annoyingDog.view', provider), vscode.window.registerWebviewViewProvider('annoyingDog.explorerView', provider));
    context.subscriptions.push(vscode.commands.registerCommand('annoyingDog.selectSprites', async () => {
        const spriteMap = {
            'spr_dtrapdog': 'Trap Dog',
            'spr_sleepdog': 'Sleep Dog',
            'spr_tobydogeat': 'Eat Dog',
            'spr_dog_walk': 'Walk Dog',
            'spr_dog_dance': 'Dance Dog',
            'spr_tenna_dance_cabbage': 'Mr. "Ant" Tenna',
            // 'spr_dogcar': 'Car Dog',
            // 'spr_dog_climb': 'Climb Dog',
            // 'spr_dog_stilts_long': 'Stilts',
            'spr_joker_dance': 'Jevil'
        };
        const allSpriteIds = Object.keys(spriteMap);
        const savedVisibleIds = context.globalState.get('visibleSprites', allSpriteIds);
        const items = allSpriteIds.map(id => ({
            label: spriteMap[id],
            description: id,
            picked: savedVisibleIds.includes(id)
        }));
        const picks = await vscode.window.showQuickPick(items, {
            canPickMany: true,
            placeHolder: 'Select sprites to show'
        });
        if (picks) {
            // Find back the IDs from the chosen labels/descriptions
            const selectedIds = picks.map(p => p.description);
            context.globalState.update('visibleSprites', selectedIds);
            provider.setVisibleSprites(selectedIds);
        }
    }));
}
function deactivate() { }
class AnnoyingDogViewProvider {
    context;
    _view;
    constructor(context) {
        this.context = context;
    }
    async resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        const webview = webviewView.webview;
        webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'assets')]
        };
        webview.onDidReceiveMessage(data => {
            if (data.type === 'ready') {
                const positions = this.context.globalState.get('spritePositions');
                const visibleSprites = this.context.globalState.get('visibleSprites');
                webview.postMessage({ type: 'initPositions', positions });
                if (visibleSprites) {
                    webview.postMessage({ type: 'setVisibleSprites', sprites: visibleSprites });
                }
            }
            else if (data.type === 'savePositions') {
                this.context.globalState.update('spritePositions', data.positions);
            }
        });
        // Read the index.html from assets and rewrite resource URLs via webview.asWebviewUri
        const htmlPath = path.join(this.context.extensionUri.fsPath, 'assets', 'index.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'assets'));
        const baseUri = `${assetUri}/`;
        const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'unsafe-inline' 'unsafe-eval' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource};">`;
        const injections = `<base href="${baseUri}">\n    ${csp}`;
        htmlContent = htmlContent.replace('<head>', `<head>\n    ${injections}`);
        webviewView.webview.html = htmlContent;
    }
    setVisibleSprites(sprites) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'setVisibleSprites', sprites });
        }
    }
}
//# sourceMappingURL=extension.js.map