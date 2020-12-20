import {Model} from "./db/Model";
import {mmApp} from "../core/mmApp";
import {IModelRules} from "./interface/IModel";
import {YandexSoundRequest} from "../api/YandexSoundRequest";
import {Text} from "../components/standard/Text";
import {IYandexRequestDownloadSound} from "../api/interfaces/IYandexApi";
import {TelegramRequest} from "../api/TelegramRequest";
import {VkRequest} from "../api/VkRequest";

/**
 * @class SoundTokens
 *
 * Модель для взаимодействия со всеми звуками.
 */
export class SoundTokens extends Model {
    private readonly TABLE_NAME = 'SoundTokens';
    public static readonly T_ALISA = 0;
    public static readonly T_VK = 1;
    public static readonly T_TELEGRAM = 2;
    public static readonly T_MARUSIA = 3;

    /**
     * Идентификатор/токен мелодии.
     */
    public soundToken: string;
    /**
     * Расположение звукового файла(url|/директория).
     */
    public path: string;
    /**
     * Тип приложения, для которого загружена мелодия.
     */
    public type: number;
    /**
     * True если передается содержимое файла. По умолчанию: false.
     */
    public isAttachContent: boolean;

    /**
     * SoundTokens constructor.
     */
    public constructor() {
        super();
        this.soundToken = null;
        this.path = null;
        this.type = SoundTokens.T_ALISA;
        this.isAttachContent = false;
    }

    /**
     * Создание таблицы бд для хранения загруженных звуков.
     *
     * @return boolean|mysqli_result|null
     * @api
     */
    public createTable() {
        /*if (IS_SAVE_DB) {
            const sql = `CREATE TABLE IF NOT EXISTS \`${this.tableName()}\` (
 \`soundToken\` VARCHAR(150) COLLATE utf8_unicode_ci NOT NULL,
 \`path\` VARCHAR(150) COLLATE utf8_unicode_ci DEFAULT NULL,
 \`type\` INT(3) NOT NULL,
 PRIMARY KEY (\`soundToken\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`;
            return this.query(sql);
        }
        return null;*/
    }

    /**
     * Удаление таблицы бд для хранения загруженных звуков.
     *
     * @return boolean|mysqli_result|null
     * @api
     */
    public dropTable() {
        /* if (IS_SAVE_DB) {
             return this.query(`DROP TABLE IF EXISTS \`${this.tableName()}\`;`);
         }
         return null;*/
    }

    /**
     * Название таблицы/файла с данными.
     *
     * @return string
     * @api
     */
    public tableName(): string {
        return this.TABLE_NAME;
    }

    /**
     * Основные правила для полей.
     *
     * @return IModelRules[]
     * @api
     */
    public rules(): IModelRules[] {
        return [
            {
                name: ['soundToken', 'path'],
                type: 'string',
                max: 150
            },
            {
                name: ['type'],
                type: 'integer',
            }
        ];
    }

    /**
     * Название атрибутов таблицы.
     *
     * @return object
     * @api
     */
    public attributeLabels(): object {
        return {
            soundToken: 'ID',
            path: 'Sound path',
            type: 'Type'
        };
    }

    /**
     * Получение идентификатора/токена мелодии.
     *
     * @return string|null
     * @api
     */
    public getToken(): string {
        switch (this.type) {
            case SoundTokens.T_ALISA:
                if (this.whereOne(`\`path\`=\"${this.path}\" AND \`type\`=${SoundTokens.T_ALISA}`)) {
                    return this.soundToken;
                } else {
                    const yImage = new YandexSoundRequest(mmApp.params.yandex_token || null, mmApp.params.app_id || null);
                    let res: IYandexRequestDownloadSound = null;
                    if (Text.isSayText(['http\:\/\/', 'https\:\/\/'], this.path)) {
                        mmApp.saveLog('SoundTokens.log', 'SoundTokens:getToken() - Нельзя отправить звук в навык для Алисы через url!');
                        return null;
                    } else {
                        res = yImage.downloadSoundFile(this.path);
                    }
                    if (res) {
                        this.soundToken = res.id;
                        if (this.save(true)) {
                            return this.soundToken;
                        }
                    }
                }
                break;

            case SoundTokens.T_VK:
                if (this.whereOne(`\`path\`=\"${this.path}\" AND \`type\`=${SoundTokens.T_VK}`)) {
                    return this.soundToken;
                } else {
                    const vkApi = new VkRequest();
                    const uploadServerResponse = vkApi.docsGetMessagesUploadServer(mmApp.params.user_id, 'audio_message');
                    if (uploadServerResponse) {
                        const uploadResponse = vkApi.upload(uploadServerResponse.upload_url, this.path);
                        if (uploadResponse) {
                            const doc = vkApi.docsSave(uploadResponse.file, 'Voice message');
                            if (doc) {
                                this.soundToken = `doc${doc.owner_id}_${doc.id}`;
                                if (this.save(true)) {
                                    return this.soundToken;
                                }
                            }
                        }
                    }
                }
                break;

            case SoundTokens.T_TELEGRAM:
                const telegramApi = new TelegramRequest();
                if (this.whereOne(`\`path\`=\"${this.path}\" AND \`type\`=${SoundTokens.T_TELEGRAM}`)) {
                    telegramApi.sendAudio(mmApp.params.user_id, this.soundToken);
                    return this.soundToken;
                } else {
                    const sound = telegramApi.sendAudio(mmApp.params.user_id, this.path);
                    if (sound && sound.ok) {
                        if (typeof sound.result.audio.file_id !== 'undefined') {
                            this.soundToken = sound.result.audio.file_id;
                            if (this.save(true)) {
                                return this.soundToken;
                            }
                        }
                    }

                }
                break;

            case SoundTokens.T_MARUSIA:
                return null;
        }
        return null;
    }
}
