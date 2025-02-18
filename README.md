# VS Code Messenger

RPC messaging library for the VS Code extension platform. Makes the communication between your [VS Code extension](https://code.visualstudio.com/) and its [webviews](https://code.visualstudio.com/api/extension-guides/webview) much simpler.

[![npm](https://img.shields.io/npm/v/vscode-messenger)](https://www.npmjs.com/package/vscode-messenger)
[![CI](https://github.com/TypeFox/vscode-messenger/actions/workflows/main.yml/badge.svg)](https://github.com/TypeFox/vscode-messenger/actions/workflows/main.yml)
[![License](https://img.shields.io/github/license/TypeFox/vscode-messenger?color=green)](https://github.com/TypeFox/vscode-messenger/blob/main/LICENSE)
[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/typefox/vscode-messenger)

#### Supported features

- Sending notification or a request from an __extension to a view__, a __view group__ or __broadcast__ to all registered views
- Sending notification or a request from a __view to other view__, a view group or the host extension
- Support for __sync and async__ request/notification handlers
- Support for __request cancellation__
- __Typed__ API
- Automatically unregister views on view dispose
- Configurable logging

#### Diagnostics vs-code extension

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/typefox.vscode-messenger-devtools?label=VS-Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=typefox.vscode-messenger-devtools)

[Devtool vscode extension](https://github.com/TypeFox/vscode-messenger/tree/main/packages/vscode-messenger-devtools) helps inspecting messages interaction between your extension components.

#### Usage in an extension (TS example)

```ts
const messenger = new Messenger();

// register one or more views
messenger.registerWebviewView(webviewView);


// Handle incoming view notification
const colorSelectType: NotificationType<string> = { method: 'colorSelected' };

messenger.onNotification(colorSelectType, (params: string) => {
    vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${params}`));
});

// Handle view requests and return a result
const availableColorsType: RequestType<string, string[]> = { method: 'availableColor' };

messenger.onRequest(availableColorsType, (params: string) => {
    return ['020202', 'f1eeee', 'a85b20', 'daab70', 'efcb99'];
});

// Send a notification to a view of type 'calicoColors.colorsView'
const colorModifyType: NotificationType<string> = { method: 'colorModify' };

messenger.sendNotification(colorModifyType, {type: 'webview', webviewType: 'calicoColors.colorsView' }, 'clear');


// Send a request to a view of type 'calicoColors.colorsView' and get a result
const selectedColor = await messenger.sendRequest({ method: 'getSelectedColor' }, {type: 'webview', webviewType: 'calicoColors.colorsView' }, '');
```

#### Usage in a webview (JS Example)

Using JS in this example for simplicity. You can use TypeScript as well.

```js
const vscode = acquireVsCodeApi();
const vscode_messenger = require("vscode-messenger-webview");

const messenger = new vscode_messenger.Messenger(vscode);

// Handle extension Notifications. For requests use `onRequest()` 
messenger.onNotification({method: 'colorModify'}, (params) => {
    switch(params) {
        case 'add': {
            addColor();
            break;
        }
        case 'clear': {
            colors = [];
            updateColorList(colors);
            break;
        }
    }
});
messenger.start(); // start listening for incoming events

// Send a request to your extension.
// For notification use `sendNotification()`
 const colors = await messenger.sendRequest({ method: 'availableColors'}, HOST_EXTENSION, '');
 console.log(colors);

```

#### More examples

See tests for more examples.
