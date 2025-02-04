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
    minmax: [0, 8],
    types: {
      Address: 'AccountId',
      Keys: 'SessionKeys2',
      LookupSource: 'AccountId',
      Schedule: 'ScheduleTo258'
    }
  }, {
    // updated to Substrate master
    minmax: [9, undefined],
    types: {
      Keys: 'SessionKeys2'
    }
  }]
};
var _default = definitions;
exports.default = _default;