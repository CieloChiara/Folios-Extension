"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
// Copyright 2017-2022 @polkadot/apps-config authors & contributors
// SPDX-License-Identifier: Apache-2.0
// structs need to be in order

/* eslint-disable sort-keys */
const definitions = {
  types: [{
    // on all versions
    minmax: [0, undefined],
    types: {
      CurvePoint: {
        start: 'BlockNumber',
        reward: 'Balance',
        taxation: 'Perbill'
      },
      Difficulty: 'U256',
      DifficultyAndTimestamp: {
        difficulty: 'Difficulty',
        timestamp: 'Moment'
      },
      Era: {
        genesisBlockHash: 'H256',
        finalBlockHash: 'H256',
        finalStateRoot: 'H256'
      }
    }
  }, {
    // swap to MultiAddress in runtime 13
    minmax: [13, undefined],
    types: {
      Address: 'MultiAddress',
      LookupSource: 'MultiAddress'
    }
  }, {
    // enable pallet-lockdrop in runtime 17
    minmax: [17, undefined],
    types: {
      CampaignIdentifier: '[u8; 4]'
    }
  }, {
    // enable pallet-atomic-swap in runtime 24
    minmax: [24, undefined],
    types: {
      HashedProof: '[u8; 32]',
      PendingSwap: {
        source: 'AccountId',
        action: 'SwapAction',
        endBlock: 'BlockNumber'
      },
      SwapAction: {
        value: 'Balance'
      }
    }
  }]
};
var _default = definitions;
exports.default = _default;