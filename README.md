Универсальное приложение для создания навыков и ботов
=====================================================
<b>Версия 1.0</b>

Документация
------------
Документация: [u-bot-ts](https://www.maxim-m.ru/bot/ts-doc/index.html). Получить информации о работе приложения можно в телеграм канале [MM](https://t.me/joinchat/AAAAAFM8AcuniLTwBLuNsw) или группе [MM](https://t.me/mm_universal_bot)

### Создание документации
Для создания документации, необходимо установить typedoc. 
```bash
 npm install typedoc -g
```
После чего выполнить:
```bash
npm run doc
```

Описание
--------
Движок позволяет создать навык для Яндекс.Алиса, Маруси, Сбер(SmartApp), бота для vk, viber или telegram, с идентичной логикой.
Типы доступных приложений в дальнейшем будут дополняться.

При необходимости есть возможность создать приложение со свой типом бота.
Тип приложения должен быть установлен в `mmApp.appType`, по умолчанию используется alisa.

Запуск
------
1. Установить зависимости.
```bash
npm i
```
2. Написать логику приложения.
3. Собрать проект.
```bash
npm run build
```
3. Запустить. Для запуска нужно в директории приложения создать package.json примерно со следующим содержимым:
```json
{
  "name": "Название приложения",
  "description": "Описание",
  "main": "index.js (Путь к индексному файлу)",
  "scripts": {
    "start": "micro",
    "build": "rm -rf dist/ && tsc"
  },
  "dependencies": {
    "micro": "^9.3.4"
  }
}
```
После, запустить сервер командой:
```bash
npm start
``` 
На данный момент поддерживается запуск через `micro`

Тестирование движка
------------
Для запуска тестов воспользуйтесь 1 из способов:
1. Собрать и запустить тесты. В таком случае происходит сборка движка + запускаются тесты.
```bash
npm run bt
```
2. Запуск только тестов. В таком случае, запустятся только тесты, но важно учесть, чтобы движок был собран.
```bash
npm test
```


# SSL
Для работы некоторых приложений, необходимо иметь ssl сертификат. Поэтому необходимо его получить. Для этого можно воспользоваться acme.
## Install acme.sh
```bash
curl https://get.acme.sh | sh
```
## Issue and install certificate for site
```bash
acme.sh --issue -d {{domain}} -w {{domain dir}}
```
1. domain - Название домена (example.com)
2. domain dir - Директория, в которой находится сайт

```bash
acme.sh --install-cert -d {{domain}} --key-file {{key file}} --fullchain-file {{cert file}} --reloadcmd "service nginx reload"
```
1. domain - Название домена (example.com)
2. key file - Директория, в которой хранится ключ сертификата
3. cert file - Директория, в которой сохранится сертификат

## Важно!
После получения сертификата, необходимо перезапустить сервер `sudo service nginx reload`

# Ngrok
Используется для локального тестирование навыка. Актуально для Алисы.
## Установка
Смотри на сайте [ngrok](https://ngrok.com/download)
## Запуск
```bash
ngrok http --host-header=rewrite <domain>:port
```
1. domain - локальный адрес сайта. Важно сайт должен быть доступен на машине! (Прописан в файле hosts)
2. port - Порт для подключения. Для бесплатного аккаунта нельзя использовать 443 порт

После успешного запуска, необходимо скопировать полученную ссылку с https, и вставить в консоль разработчика.

# Тестирование приложения
Протестировать приложение можно 2 способами:
1. Через ngrok (Актуально для Алисы).
2. Через консоль (локально).
## Тестирование через Ngroc
Для тестирование через ngrok, необходимо скачать программу, а также запустить её.
После полученную ссылку с https, вставить в [консоль разработчика](https://dialogs.yandex.ru/developer), и перейти на вкладку тестирования.
Данное действие актуально только для Алисы.

## Тестирование в консоли
Для тестирования используется тот же код что и при запуске. С той лишь разнице, что нужно вызывать метод test вместо run + не нужно запускать micro.
После просто запустить приложение. 
```bash
node index.js
```
После откроется консоль с ботом. Для выхода из режима тестирования нужно:
1. Если навык в определенный момент ставит `isEnd` в True (Что означает завершение диалога), то нужно дойти до того места сценария, в котором диалог завершается.
2. Вызвать команду exit.

Помимо ответов, можно вернуть время обработки команд.

Помощь и поддержка проекта
------
Любая помощь и поддержка приветствуется.
Если будут найдены различные ошибки или предложения по улучшению, то смело пишите на почту: maximco36895@yandex.ru