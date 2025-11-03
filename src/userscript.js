import customCss from './userscript.scss';
import './lib/navigation';
import { installHotkeyGradingHandler } from './lib/keypad';
import { installGradingTimer } from './lib/grading_timer';
import './lib/comments';
import './lib/transcribe';
import './lib/fast_booklet_switch';
import './lib/booklet_prefetch';
import './lib/tweaks_button';

GM_addStyle(customCss);
installHotkeyGradingHandler();
installGradingTimer();