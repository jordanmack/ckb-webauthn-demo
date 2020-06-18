const CKB = require('@nervosnetwork/ckb-sdk-core').default;
const {
  scriptToHash,
  parseAddress,
  // hexToBytes as CKBHexToBytes,
  serializeWitnessArgs,
  toHexInLittleEndian,
  fullPayloadToAddress,
  AddressType,
  AddressPrefix,
  rawTransactionToHash,
  toUint32Le,
  toUint64Le
} = require('@nervosnetwork/ckb-sdk-utils');
const arrayBufferToHex = require('array-buffer-to-hex');
const { sha3, hexToNumber, bytesToHex, hexToBytes, padRight, padLeft, numberToHex } = require('web3-utils');
const { createHash } = require('crypto');

const { publicKeyCredentialToJSON, parseGetAssertAuthData } = require('./utils');

const querystring = require('querystring');

const {
  CKB_NODE_URL,
  blockAssemblerCode,
  r1TypeId,
  secp256R1LockCell
} = require('./ckb_config_lay2');


const ckb = new CKB(CKB_NODE_URL);

function addressFromPubKey (pubKey) {
  return fullPayloadToAddress({
    arg: pubKey,
    prefix: AddressPrefix.Testnet,
    codeHash: r1TypeId,
    type: AddressType.TypeCodeHash
  });
}

async function getBalance (pubKey) {
  const lockHash = scriptToHash({
    codeHash: r1TypeId,
    hashType: 'type',
    args: pubKey,
  });
  // const balance = await ckb.rpc.getCapacityByLockHash(lockHash);

  const url = 'https://cellapi.ckb.pw/cell/getCapacityByLockHash?lockHash=' + lockHash;

  const response = await fetch(url);
  const result = await response.text();
  console.log('balance', result);

  const balance = hexToNumber(result);
  const balanceStr = balance / 10 ** 8 + 'CKB';

  return balanceStr;
}

async function getUnspentCell(lockHash){
  // const unspentCells = await ckb.loadCells({ lockHash });
  // return unspentCells;

  const args = {
    capacity: numberToHex(1000 * 10 ** 8),
    lockHash,
  };

  const params = querystring.stringify(args);
  const url = 'https://cellapi.ckb.pw/cell/unSpent?' + params;
  console.log('url', url);

  const response = await fetch(url);
  const result = await response.json();
  console.log('response', result);

  return result;

}
function changeOutputLock(tx, oldLockHash, newLock) {
  for (const output of tx.outputs) {
    if (scriptToHash(output.lock) === oldLockHash) {
      output.lock = newLock;
    }
  }
}

async function buildR1Tx (r1PubKey, to, capacity) {

  const from = 'ckt1qyqwzd6uxvrh9v2xdp2v5x7uh3gnexcmwncsa967p8';

  const secp256k1Dep = {
    hashType: 'type',
    codeHash: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8',
    outPoint: {
      txHash: '0xace5ea83c478bb866edf122ff862085789158f5cbff155b7bb5f13058555b708',
      index: '0x0',
    },
  };
  const inputLockHash = scriptToHash({
    codeHash: r1TypeId,
    hashType: 'type',
    args: r1PubKey,
  });
  console.log('inputLockHash', {
    codeHash: r1TypeId,
    hashType: 'type',
    args: r1PubKey,
  });
  const unspentCells = await getUnspentCell(inputLockHash);

  const rawTx = ckb.generateRawTransaction({
    fromAddress: from,
    toAddress: to,
    capacity: BigInt(capacity * 10 ** 8),
    fee: BigInt(100000),
    cells: unspentCells,
    deps: secp256k1Dep,
    safeMode: true,
  });

  ;
  const oldOutputLockHash = scriptToHash({
    codeHash: blockAssemblerCode,
    hashType: 'type',
    args: `0x${parseAddress(from, 'hex').slice(6)}`,
  });
  /*change cell*/
  const newOutputLock = {
    codeHash: r1TypeId,
    hashType: 'type',
    args: r1PubKey,
  };

  changeOutputLock(rawTx, oldOutputLockHash, newOutputLock);

  rawTx.cellDeps.push({ outPoint: secp256R1LockCell.outPoint, depType: 'code' });

  rawTx.witnesses = rawTx.inputs.map(() => '0x');
  rawTx.witnesses[0] = { lock: '', inputType: '', outputType: '' };

  return rawTx;

}

function hash(data) {
  return createHash('SHA256')
    .update(data)
    .digest();
}

ArrayBuffer.prototype.toBuffer = function(){
  const hex = arrayBufferToHex(this);
  return Buffer.from(hex.replace('0x', ''), 'hex');
}

function extractRSFromSignature(signature){

  const rlen = signature[3];
  const slen = signature[3 + rlen + 2];
  console.log('r,s len', rlen, slen)

  const rHex = padLeft(signature.slice(4, 4 + rlen).toString('hex'), 64, '0');
  const sHex = padLeft(signature.slice(3 + rlen + 2 + 1).toString('hex'), 64, '0');

  console.log('r', rHex);
  console.log('s', sHex);
  const r = Buffer.from(rHex, 'hex');
  const s = Buffer.from(sHex, 'hex');

  return { r: r.slice(-32), s: s.slice(-32) };

}


async function signR1Tx(rawTx) {
  const transactionHash = rawTransactionToHash(rawTx)

  console.log('rawTransaction', rawTx)
  console.log('txhash', transactionHash)
  const emptyWitness = rawTx.witnesses[0];
  emptyWitness.lock = '0x' + '0'.repeat(600);

  const serializedEmptyWitnessBytes = hexToBytes(serializeWitnessArgs(emptyWitness))
  const serialziedEmptyWitnessSize = serializedEmptyWitnessBytes.length
  console.log('serialziedEmptyWitnessSize', serialziedEmptyWitnessSize)

  // Calculate keccak256 hash for rawTransaction
  const sha256Hasher = createHash('SHA256');
  sha256Hasher.update(Buffer.from(transactionHash.replace('0x', ''), 'hex'));
  sha256Hasher.update(Buffer.from(toUint64Le(`0x${serialziedEmptyWitnessSize.toString(16)}`).replace('0x', ''), 'hex'));
  sha256Hasher.update(Buffer.from(serializedEmptyWitnessBytes));

  rawTx.witnesses.slice(1).forEach((w) => {
    const bytes = hexToBytes(typeof w === 'string' ? w : serializeWitnessArgs(w))
    sha256Hasher.update(
      Buffer.from(toUint64Le(`0x${bytes.length.toString(16)}`).replace('0x', ''), 'hex')
    )
    sha256Hasher.update(Buffer.from(bytes))
  })


  let challenge = sha256Hasher.digest();
  console.log('challenge', challenge)
  // challenge = b64encode(challenge, 'hex')
  let credID = localStorage.getItem('credID');
  const credIDBuffer = base64url.decode(credID);

  let webauthnPubKey = {
    challenge,
    allowCredentials: [
      {
        id: credIDBuffer,
        transports: ['usb', 'nfc', 'ble'],
        type: 'public-key'
      }
    ]
  };

  const webauthnResult = await navigator.credentials.get({ publicKey: webauthnPubKey });
  // let getAssertionResponse = publicKeyCredentialToJSON(webauthnResult);
  console.log('webauthResult', webauthnResult);
  const { signature, clientDataJSON, authenticatorData } = webauthnResult.response;
console.log('signature', arrayBufferToHex(signature));
console.log('clientDataJSON', arrayBufferToHex(clientDataJSON));
  const utf8Decoder = new TextDecoder('utf-8')
  const decodedClientData = utf8Decoder.decode(clientDataJSON)
  const clientDataObj = JSON.parse(decodedClientData)

  console.log('clientDataObj', clientDataObj);

  let authrDataStruct  = parseGetAssertAuthData(authenticatorData);
  console.log("authrDataStruct", authrDataStruct);

  const { r, s } = extractRSFromSignature(signature.toBuffer());
  const rsSignature = Buffer.concat([r, s])

  const authrData = Buffer.concat([authrDataStruct.rpIdHash.toBuffer(), authrDataStruct.flagsBuf.toBuffer(), authrDataStruct.counterBuf.toBuffer()]);

  console.log('signature', rsSignature.toString('hex'));
  console.log('authrData', authrData.toString('hex'));

  const lockBuffer = Buffer.concat([rsSignature, authrData, clientDataJSON.toBuffer()]);

  emptyWitness.lock = lockBuffer.toString('hex');
  emptyWitness.lock = '0x' + padRight(emptyWitness.lock, 600, '0')

  console.log('emptyWitness.lock', emptyWitness.lock)

  const signedWitnesses = [serializeWitnessArgs(emptyWitness), ...rawTx.witnesses.slice(1)]
  const tx = {
    ...rawTx,
    witnesses: signedWitnesses.map((witness) =>
      typeof witness === 'string' ? witness : serializeWitnessArgs(witness)
    ),
  }

  return tx
}

async function sendCKB (pubKey) {
  console.log('start send CKB to ', pubKey);
  const tx = await buildR1Tx(pubKey, 'ckt1qyqv4yga3pgw2h92hcnur7lepdfzmvg8wj7qn44vz8', 100);
  const signedTx = await signR1Tx(tx);
  console.log('signedTx', signedTx);
  
  const realTxHash = await ckb.rpc.sendTransaction(signedTx);
  console.log(`The real transaction hash is: ${realTxHash}`);

  return realTxHash;

}

module.exports = {
  addressFromPubKey,
  getBalance,
  sendCKB
}
