import Server from '../../../backend';
import CookieParser from 'cookie-parser';
import Q from 'q';
import sessionParser from './session-parser';

const cookieParser = CookieParser();
const cookieKeyPrefixLen = 's:'.length;

export default {
  // async connect(clientData, store, msg, send, broadcast, req) {
  //   await Q.nfcall(sessionParser, req, {});
  //   console.log(req.session);
  // },

  // create(clientData, store, msg, send, broadcast) {
  //   if (clientData.privileges !== 'readwrite') {
  //     send({
  //       type: 'reject',
  //       storeName: msg.storeName,
  //       key: msg.key,
  //       description: 'You do not have privileges to create records',
  //     });
  //   } else {
  //     Server.defaultHandlers.create.apply(undefined, arguments);
  //   }
  // },

  // 'get-changes'(clientData, store, msg, send, broadcast) {
  //   if (clientData.privileges === 'readwrite' ||
  //       clientData.privileges === 'readonly') {
  //     Server.defaultHandlers['get-changes'].apply(undefined, arguments);
  //   } else {
  //     send({
  //       type: 'unauthorized',
  //       requestedStore: msg.storeName,
  //       description: 'You do not have privileges to read records',
  //     });
  //   }
  // },

  // authenticate(clientData, store, msg, send, broadcast) {
  //   console.log('Authentication message recieved');
  //   const res = {type: 'auth-response'};
  //   if (msg.token === 'token1') {
  //     clientData.authenticated = res.success = true;
  //     clientData.privileges = 'readonly';
  //   } else if (msg.token === 'token2') {
  //     clientData.authenticated = res.success = true;
  //     clientData.privileges = 'readwrite';
  //   } else {
  //     res.success = false;
  //   }
  //   send(res);
  // }
};
