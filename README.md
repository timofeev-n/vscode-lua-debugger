# Playrix Script Debugging Extension for Visual Studio Code

Adds Playrix script debugging support to Visual Studio Code. 

Currently supports:

* setting breakpoints;
* stepping into/through code;
* seeing values for local and global variables;
* navigating the call stack

![alt](https://share.dataservices.theice.com/sharedaccess/e0cf1f4-36c5e61/Playrix-debug.gif)

## Overview

Playrix lua script debugger.


## Quick start

* Install [Playrix]().
* Install this extension from [VSCode Marketplace](https://marketplace.visualstudio.com/items?itemName=playrix.script-debugger)
  (or by entering `ext install playrix.script-debugger` at the command palette <kbd>Ctrl</kbd>+<kbd>P</kbd>).
* Open project's folder
* Create launch configurations by going into Debug section (Ctrl + Shift + D) and either select Add Configuration from the drop-down or press Configure or Fix “launch.json” button.
* Make sure that Playrix is running and you have at least one chart on a page
* Click on Start Debugging in the Debug tab in VS Code
* Select chart if needed

## Configuration

Extension by default creates the following configuration:

```js
{
    "type": "playrix-lua",
    "request": "launch",
    "name": "Start Game",
}

}
```
* **type: “playrix-lua”** – type of debugger to be used.
* **request: launch** – currently only launch mode is supported, which means that VS Code extension will create a new copy of a script on the chart each time the debug session is run. After session is completed the script will be removed from the chart. Alternatively, the attach mode can be used, which will attach the debugger to an already running script on the chart. In this mode the script will not be removed from the chart on session finish. Attach mode will be added in the future.


