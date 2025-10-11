import customCss from './userscript.scss';
import './lib/navigation';
import { installHotkeyGradingHandler } from './lib/keypad';
import { installGradingTimer } from './lib/grading_timer';
import './lib/comments';
import './lib/transcribe';

GM_addStyle(customCss);
installHotkeyGradingHandler();
installGradingTimer();