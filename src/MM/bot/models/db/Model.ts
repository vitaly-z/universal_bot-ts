/**
 * Class Model
 * @package bot\models\db
 *
 * Абстрактный класс для моделей. Все Модели, взаимодействующие с бд наследуют его.
 */
import {IS_SAVE_DB, mmApp} from "../../core/mmApp";
import {IModelRules, TModelRulesType} from "../interface/IModel";
import {Text} from "../../components/standard/Text";
import {Sql} from "./Sql";
import {fread, is_file} from "../../utils/functins";

export interface IModelRes {
    status: boolean;
    error?: string;
    data?: any;
}

export abstract class Model {
    /**
     * Стартовое значение для индекса.
     * @var int startIndex Стартовое значение для индекса.
     */
    public startIndex = 0;
    /**
     * Подключение к базе данных.
     * @var Sql|null db Подключение к базе данных.
     */
    private _db: Sql;

    /**
     * Правила для обработки полей. Где 1 - Элемент это название поля, 2 - Элемент тип поля, max - Максимальная длина.
     *
     * @return IModelRules[]
     * [
     *  - string|array 0: Название поля.
     *  - string 1: Тип поля (text, string, integer, ...).
     *  - int max: Максимальная длина строки.
     * ]
     */
    public abstract rules(): IModelRules[];

    /**
     * Массив с полями таблицы, где ключ это название поля, а значение краткое описание.
     * Для уникального ключа использовать значение ID.
     *
     * @return object
     */
    public abstract attributeLabels(): object;

    /**
     * Название таблицы/файла с данными.
     *
     * @return string
     */
    public abstract tableName(): string;

    /**
     * Model constructor.
     */
    protected constructor() {
        if (IS_SAVE_DB) {
            this._db = new Sql();
        } else {
            this._db = null;
        }
    }

    /**
     * Декодирование текста(Текст становится приемлемым и безопасным для sql запроса).
     *
     * @param text Исходный текст.
     * @return string
     * @api
     */
    public escapeString(text: string | number): string {
        if (IS_SAVE_DB) {
            return this._db.escapeString(text);
        }
        return text.toString();
    }

    /**
     * Валидация значений полей для таблицы.
     * @api
     */
    public validate(): void {
        if (IS_SAVE_DB) {
            const rules = this.rules();
            if (rules) {
                rules.forEach((rule) => {
                    let type = 'number';
                    switch (rule.type) {
                        case 'string':
                        case 'text':
                            type = 'string';
                            break;
                        case 'int':
                        case 'integer':
                        case 'bool':
                            type = 'number';
                            break;
                    }
                    rule.name.forEach((data) => {
                        if (type === 'string') {
                            if (typeof rule.max !== 'undefined') {
                                this[data] = Text.resize(this[data], rule.max);
                            }
                            this[data] = this.escapeString(this[data]);
                        } else {
                            this[data] = +this[data];
                        }
                    })
                })
            }
        }
    }

    /**
     * Возвращает тип поля таблицы.
     *
     * @param index Название поля таблицы.
     * @return TModelRulesType|null
     */
    /*protected isAttribute(index: string | number): TModelRulesType {
        const rules = this.rules();
        if (rules) {
            rules.forEach((rule) => {
                rule.name.forEach((data) => {
                    if (data === index) {
                        return rule.type;
                    }
                })
            })
        }
        return null;
    }*/

    /**
     * Получить обработанное значение для сохранения, где строка оборачивается в двойные кавычки.
     *
     * @param val Значение поля.
     * @param type Тип поля.
     * @return string|number
     */

    /* protected getVal(val: string | number, type: TModelRulesType): string | number {
         switch (type) {
             case 'string':
             case 'text':
                 return `"${val}"`;
             case 'int':
             case 'integer':
             case 'bool':
                 return val;
         }
         return null;
     }*/

    /**
     * Возвращает название уникального ключа таблицы.
     *
     * @return number|string|null
     */
    protected getId(): string | number {
        const labels = this.attributeLabels();
        let key = null;
        Object.keys(labels).forEach((index) => {
            if (labels[index] === 'id' || labels[index] === 'ID') {
                key = index;
                return index;
            }
        })
        return key;
    }

    /**
     * Инициализация данных для модели.
     *
     * @param data Массив с данными.
     * @api
     */
    public init(data): void {
        let i = this.startIndex;
        const labels = this.attributeLabels();
        Object.keys(labels).forEach((index) => {
            if (IS_SAVE_DB) {
                this[index] = data[i] ?? data[index];
            } else {
                this[index] = data[index] ?? '';
            }
            i++;
        })
    }

    /**
     * Выполняет запрос с поиском по уникальному ключу.
     *
     * @return boolean|mysqli_result|array|null
     * @api
     */
    public selectOne() {
        const idName = this.getId();
        if (idName) {
            if (this[idName]) {
                if (IS_SAVE_DB) {
                    return this._db.query(async (client, db) => {
                        let res: IModelRes = {
                            status: false
                        };
                        const collection = db.collection(this.tableName());
                        let data = {
                            [idName]: this[idName]
                        }
                        await collection.findOne(data, (err, result) => {
                            if (err) {
                                res = {status: false, error: err};
                                return res;
                            }
                            client.close();
                            res = {
                                status: true,
                                data: result.ops
                            };
                            return res;
                        });
                        return res;
                    })
                } else {
                    const data = this.getFileData();
                    return data[this[idName]] ?? null;
                }
            }
        }
        return null;
    }

    /**
     * Сохранение значения в базу данных.
     * Если значение уже есть в базе данных, то данные обновятся. Иначе добавляется новое значение.
     *
     * @param isNew Добавить новую запись в базу данных без поиска по ключу.
     * @return boolean|mysqli_result|null
     * @api
     */
    public save(isNew: boolean = false) {
        this.validate();
        if (isNew) {
            return this.add();
        }
        if (this.selectOne()) {
            return this.update();
        } else {
            return this.add();
        }
    }

    /**
     * Обновление значения в таблице.
     *
     * @return boolean|mysqli_result|null
     * @api
     */
    public update() {
        if (IS_SAVE_DB) {
            this.validate();
            const idName = this.getId();
            if (idName) {
                return this._db.query(async (client, db) => {
                    let res: IModelRes = {
                        status: false
                    };
                    const collection = db.collection(this.tableName());
                    let data = {}
                    Object.keys(this.attributeLabels()).forEach((index) => {
                        if (index != idName) {
                            data[index] = this[index];
                        }
                    })
                    await collection.updateOne({[idName]: this[idName]}, {$set: data}, (err, result) => {
                        if (err) {
                            res = {status: false, error: err};
                            return res;
                        }
                        client.close();
                        res = {
                            status: true,
                            data: result.ops
                        };
                        return res;
                    });
                    return res;
                });
            }
        } else {
            const data = this.getFileData();
            const idName = this.getId();
            if (typeof data[this[idName]] !== 'undefined') {
                const tmp: any = {};
                Object.keys(this.attributeLabels()).forEach((index) => {
                    tmp[index] = this[index];
                })
                data[this[idName]] = tmp;
                mmApp.saveJson(`${this.tableName()}.json`, data);
            }
            return true;
        }
        return null;
    }

    /**
     * Добавление значения в таблицу.
     *
     * @return boolean|mysqli_result|null
     * @api
     */
    public add() {
        if (IS_SAVE_DB) {
            this.validate();
            const idName = this.getId();
            if (idName) {
                return this._db.query(async (client, db) => {
                    let res: IModelRes = {
                        status: false
                    };
                    let data = {};
                    Object.keys(this.attributeLabels()).forEach((index) => {
                        if (index !== idName && this[index]) {
                            data[index] = this[index];
                        }
                    })
                    const collection = db.collection(this.tableName());

                    await collection.insertOne(data, (err, result) => {
                        if (err) {
                            res = {status: false, error: err};
                            return res
                        }
                        client.close();
                        res = {
                            status: true,
                            data: result.ops
                        };
                        return res;
                    });
                    return res;
                });
            }
        } else {
            const data = this.getFileData();
            const idName = this.getId();
            const tmp = {};
            Object.keys(this.attributeLabels()).forEach((index) => {
                tmp[index] = this[index];
            })
            data[this[idName]] = tmp;
            mmApp.saveJson(`${this.tableName()}.json`, data);
            return true;
        }
        return null;
    }

    /**
     * Удаление значения из таблицы.
     *
     * @return boolean|mysqli_result|null
     * @api
     */
    public delete() {
        if (IS_SAVE_DB) {
            const idName = this.getId();
            let data = null;
            if (idName) {
                const val = this[idName];
                if (val) {
                    data = {
                        [idName]: val
                    };
                }
            }
            if (data) {
                return this._db.query(async (client, db) => {
                    let res: IModelRes = {
                        status: false
                    };
                    const collection = db.collection(this.tableName());

                    await collection.deleteOne(data, (err, result) => {
                        if (err) {
                            res = {status: false, error: err};
                            return res;
                        }
                        client.close();
                        res = {
                            status: true,
                            data: result.ops
                        }
                        return res;
                    });
                    return res;
                });
            }
        } else {
            const data = this.getFileData();
            const idName = this.getId();
            if (typeof data[this[idName]] !== 'undefined') {
                delete data[this[idName]];
                mmApp.saveJson(`${this.tableName()}.json`, data);
            }
            return true;
        }
        return false;
    }

    /**
     * Выполнение запроса к данным.
     *
     * @param where Запрос к таблице.
     * @param isOne Вывести только 1 результат. Используется только при поиске по файлу.
     * @return boolean|mysqli_result|array|null
     * @api
     */
    public where(where: any = '1', isOne: boolean = false) {
        if (IS_SAVE_DB) {
            return this._db.query(async (client, db) => {
                let res: IModelRes = {
                    status: false
                }
                const collection = db.collection(this.tableName());
                if (typeof where === 'string') {
                    where = {};
                }
                await collection.find(where).toArray((err, results) => {
                    if (err) {
                        res = {status: false, error: err};
                    }
                    client.close();
                    res = {
                        status: true,
                        data: results
                    }
                    return res
                });
                return res;
            });
        } else {
            const datas = where.matchAll(/((`[^`]+`)=(("[^"]+")|([^ ]+)))/gmi);
            const content = this.getFileData();
            if (datas) {
                let result = null;

                const regDatas: { key: string, val: string }[] = [];
                let data = datas.next();
                while (!data.done) {
                    regDatas.push(
                        {
                            key: data.value[2].replace(/\`/g, ''),
                            val: data.value[3].replace(/\"/g, '')
                        })
                    data = datas.next();
                }

                for (const key in content) {
                    let isSelected = null;

                    for (const regData of regDatas) {
                        isSelected = content[key][regData.key] === regData.val;
                        if (isSelected === false) {
                            break;
                        }
                    }

                    if (isSelected) {
                        if (isOne) {
                            result = content[key];
                            return content[key];
                        }
                        if (result === null) {
                            result = [];
                        }
                        result.push(content[key]);
                    }
                }
                if (result) {
                    return result;
                }
            }
        }
        return null;
    }

    /**
     * Выполнение запроса и инициализация переменных в случае успешного запроса.
     *
     * @param where Запрос к таблице.
     * @return boolean
     * @api
     */
    public whereOne(where: any = '1'): boolean {
        if (IS_SAVE_DB) {
            return !!this._db.query(async (client, db) => {
                let res: IModelRes = {
                    status: false
                }
                const collection = db.collection(this.tableName());
                if (typeof where === 'string') {
                    where = {};
                }
                await collection.findOne(where, (err, result) => {
                    if (err) {
                        res = {status: false, error: err};
                        return res;
                    }
                    client.close();
                    res = {
                        status: true,
                        data: result
                    };
                    return res;
                });
                return res;
            });
        } else {
            const query = this.where(where, true);
            if (query) {
                this.init(query);
                return true;
            }
        }
        return false;
    }

    /**
     * Получение всех значений из файла. Актуально если глобальная константа IS_SAVE_DB равна false.
     *
     * @return array|mixed
     * @api
     */
    public getFileData() {
        const path = mmApp.config.json;
        const fileName = this.tableName().replace(/\`/g, '');
        const file = `${path}/${fileName}.json`;
        if (is_file(file)) {
            return JSON.parse(fread(file));
        } else {
            return {};
        }
    }

    /**
     * Выполнение произвольного запрос к базе данных.
     *
     * @param callback Непосредственно запрос к бд.
     * @return boolean|mysqli_result|null
     * @api
     */
    public query(callback: Function) {
        if (IS_SAVE_DB) {
            return this._db.query(callback);
        }
        return null;
    }
}
