const { scriptToHash } = require('@nervosnetwork/ckb-sdk-utils')

const CKB_NODE_URL = 'http://127.0.0.1:8114';
const blockAssemblerCode = '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8';
const r1Type = {
  codeHash: '0xffa8b87211aeca8237677e057adf45cf97e3e1726a2d160817d1d665be5ee340',
  hashType: 'data',
  args: '0x00000000000000000b72eec33f72016f87a8be7d0e53580ab258e687e2ad0e5026e9248afec051d400000000'
};
const r1TypeId = scriptToHash(r1Type);
const secp256R1LockCell = {
  type: r1Type,
  lock: {
    codeHash: blockAssemblerCode,
    hashType: 'type',
    args: '0xca911d8850e55caabe27c1fbf90b522db10774bc',
  },
  capacity: 150000 * 10 ** 8,
  outPoint: {
    txHash: '0xe006effe1db93d96a592fd30bbd5648bcdd5f94955c49dd2e8c21967f2f6917a',
    index: '0x0',
  },

};

module.exports = {
  CKB_NODE_URL,
  blockAssemblerCode,
  r1TypeId,
  secp256R1LockCell
};
