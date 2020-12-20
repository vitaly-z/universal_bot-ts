import {TemplateCardTypes} from "./TemplateCardTypes";
import {IViberButtonObject} from "../../button/interfaces/IViberButton";
import {Buttons} from "../../button/Buttons";
import {Image} from "../../image/Image";

export interface IViberCard {
    /**
     * Количество колонок
     */
    Columns: number;
    /**
     * Количество столбцов
     */
    Rows: number;
    /**
     * Ссылка на изображение
     */
    Image?: string;
    /**
     * Текст
     */
    Text?: string;
    ActionType?: string;
    ActionBody?: string;
}

/**
 * Класс отвечающий за отображение карточки в Viber.
 * @class ViberCard
 */
export class ViberCard extends TemplateCardTypes {
    /**
     * Получение элемента карточки.
     * @param {Image} image Объект с изображением
     * @param {number} countImage Количество изображений
     * @returns {IViberCard}
     * @private
     */
    protected static _getElement(image: Image, countImage: number = 1): IViberCard {
        if (!image.imageToken) {
            if (image.imageDir) {
                image.imageToken = image.imageDir;
            }
        }

        let element: IViberCard = {
            Columns: countImage,
            Rows: 6,
        };
        if (image.imageToken) {
            element.Image = image.imageToken;
        }
        const btn: IViberButtonObject = image.button.getButtons(Buttons.T_VIBER_BUTTONS);
        if (btn && typeof btn.Buttons !== 'undefined') {
            element = {...element, ...btn.Buttons[0]};
            element.Text = `<font color=#000><b>${image.title}</b></font><font color=#000>${image.desc}</font>`;
        }
        return element;
    }

    /**
     * Получение карточки для отображения пользователю.
     *
     * @param  {boolean} isOne True, если в любом случае отобразить 1 элемент карточки
     * @return IViberCard[] | IViberCard
     * @api
     */
    public getCard(isOne: boolean): IViberCard[] | IViberCard {
        let objects: IViberCard[] = [];
        let countImage = this.images.length;
        if (countImage > 7) {
            countImage = 7;
        }
        if (countImage) {
            if (countImage === 1 || isOne) {
                if (!this.images[0].imageToken) {
                    if (this.images[0].imageDir) {
                        this.images[0].imageToken = this.images[0].imageDir;
                    }
                }
                if (this.images[0].imageToken) {
                    return ViberCard._getElement(this.images[0]);
                }
            } else {
                this.images.forEach((image) => {
                    objects.push(ViberCard._getElement(image, countImage));
                })
            }
        }
        return objects;
    }
}
