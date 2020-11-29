const { scriptToHash } = require('@nervosnetwork/ckb-sdk-utils')

const CKB_NODE_URL = 'https://aggron.ckb.dev';
const blockAssemblerCode = '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8';
const r1Type = {
  codeHash: '0x00000000000000000000000000000000000000000000000000545950455f4944',
  hashType: 'type',
  args: '0xb1ddc954094e1fd2cc39414a620ccf1c84987a5514c3ba99a524af7e15126df5'
};
const r1TypeId = scriptToHash(r1Type);
const secp256R1LockCell = {
  type: r1Type,
  lock: {
    codeHash: blockAssemblerCode,
    hashType: 'type',
    args: '0xca911d8850e55caabe27c1fbf90b522db10774bc',
  },
  capacity: 70000 * 10 ** 8,
  outPoint: {
    txHash: '0x28ee75f9745828eaade301ef24d0b037404717469a299180ecb679259cb688ab',
    index: '0x0',
  },

};

const secp256k1Dep = {
  hashType: 'type',
  codeHash: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8',
  outPoint: {
    txHash: '0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37',
    index: '0x0',
  },
}
const CELL_API_BASE = 'https://cellapiaggron.ckb.pw';

module.exports = {
  CKB_NODE_URL,
  secp256k1Dep,
  blockAssemblerCode,
  r1TypeId,
  secp256R1LockCell,
  CELL_API_BASE,
};
