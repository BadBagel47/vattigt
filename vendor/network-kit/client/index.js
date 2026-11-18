// network-kit browser client entry.
export { NetworkRoom, RoomError } from './room.js';
export { shareLink, readShareLink, forgetShareKey, qrSvg, qrMatrix } from './share.js';
export { tabSession } from './tab.js';
export { MEASURE_NOTICE } from './measure.js';
export { adminPass, forgetAdminPass } from './admin-pass.js';
export { watchNotices, NoticeBoard, playWarningSound, noticeText } from './notices.js';
export {
  PROTOCOL, CLOSE, CLOSE_UNRESPONSIVE, CLOSE_TEXT, gameClosedText, NOTICE_TEXT, normalizeCode, isValidCode, CODE_LENGTH, CODE_MIN_LENGTH, CODE_MAX_LENGTH,
} from '../shared/protocol.js';
export { VERSION } from '../version.js';
