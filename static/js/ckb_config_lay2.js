const { scriptToHash } = require('@nervosnetwork/ckb-sdk-utils')

const CKB_NODE_URL = 'https://lay2.ckb.dev';
const blockAssemblerCode = '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8';
const r1Type = {
  codeHash: '0xffa8b87211aeca8237677e057adf45cf97e3e1726a2d160817d1d665be5ee340',
  hashType: 'data',
  args: '0x0000000000000000424b7c3354dadf21d69f9faa4f7ebec45976559adfb1ad24ee210e34ace289a701000000'
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
    txHash: '0x9d41a44e88ffd3d8b0dcf6a30c00f262b8d95f6e3c9f6bd8aa37ef5ad06d8ffc',
    index: '0x0',
  },

};

const secp256k1Dep = {
  hashType: 'type',
  codeHash: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8',
  outPoint: {
    txHash: '0xace5ea83c478bb866edf122ff862085789158f5cbff155b7bb5f13058555b708',
    index: '0x0',
  },
}

const CELL_API_BASE = 'https://cellapilay2.ckb.pw';

module.exports = {
  CKB_NODE_URL,
  secp256k1Dep,
  blockAssemblerCode,
  r1TypeId,
  secp256R1LockCell,
  CELL_API_BASE,
}
