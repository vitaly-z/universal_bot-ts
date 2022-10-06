/**
 * Created by umbot
 * Date: {{date}}
 * Time: {{time}}
 */
import {run} from 'umbot/build';
import {{name}}Config from './config/{{name}}Config';
import {{name}}Params from './config/{{name}}Params';
import {__className__Controller} from './controller/__className__Controller';

const config = {
    appConfig: {{name}}Config,
    appParam: {{name}}Params,
    controller: (new __className__Controller())
};
const mode = 'dev';// Режим работы приложения. (prod, dev, dev-online)
run(config, mode);
