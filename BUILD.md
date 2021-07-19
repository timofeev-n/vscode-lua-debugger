## Инициализация репозитория
```sh
git clone vscode-debugger
cd vscode-debugger

```


```sh
npm i
```


## Разработка
Для сборки проекта используется webpack.



или

```sh
npx tsc -b tsconfig-modules.json && npx webpack --watch --mode development
```

При необходимости внесения правок в код модулей зависимостей

```sh
yarn run watchmodules
```
или 
```sh
npx tsc -b -w tsconfig-modules.json
```

## Варианты запуска

Расширение состоит из двух частей:
* extension - само расширение, которое загружается vscode;
* adapter - реализация debug adapter protocol для Lua;

Adapter на текущий момент может выполняться в двух режимах:
* отдельный процесс;
* сессия внутри самого расширения;

### Запуск адаптера в отдельном процессе.

Данный вариант используется в финальном варианте. Расширение по требованию стартует node процесс для выполнения кода адаптера.
Для отладки такого варианта нужно использовать Attach к процессу node.
Так же адаптер можно запустить с параметром командной строки --server.

### Запуск адаптера внутри расширения .

## Cборка / публикация


# Change Log
All notable changes to the "vscode-scriptdebugger" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.