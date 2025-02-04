// Copyright 2019-2022 @polkadot/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { KeyringOption$Type, KeyringOptions, KeyringSectionOption, KeyringSectionOptions } from '@polkadot/ui-keyring/options/types';
import type { Option } from './types';

import React from 'react';
import store from 'store';
import styled from 'styled-components';

import { BackgroundWindow } from '@polkadot/extension-base/background/KoniTypes';
import { withMulti, withObservable } from '@polkadot/extension-koni-ui/Popup/Sending/old/api/hoc';
import { ThemeProps } from '@polkadot/extension-koni-ui/types';
import { createOptionItem } from '@polkadot/ui-keyring/options/item';
import { isNull, isUndefined } from '@polkadot/util';

import { isValidAddressPolkadotAddress, isValidEvmAddress } from '../../convert';
import Dropdown from '../Dropdown';
import Static from '../Static';
import { toAddress } from '../util';
import createHeader from './createHeader';
import createItem from './createItem';

const bWindow = chrome.extension.getBackgroundPage() as BackgroundWindow;
const { keyring } = bWindow.pdotApi;

interface Props {
  addresses?: string[];
  className?: string;
  defaultValue?: Uint8Array | string | null;
  filter?: string[] | null;
  help?: React.ReactNode;
  hideAddress?: boolean;
  isDisabled?: boolean;
  isError?: boolean;
  isInput?: boolean;
  autoPrefill?: boolean;
  label?: React.ReactNode;
  labelExtra?: React.ReactNode;
  onChange?: (value: string | null) => void;
  onChangeMulti?: (value: string[]) => void;
  options?: KeyringSectionOption[];
  optionsAll?: Record<string, Option[]>;
  placeholder?: string;
  type?: KeyringOption$Type;
  value?: string | Uint8Array | string[] | null;
  withEllipsis?: boolean;
  withLabel?: boolean;
  isEthereum?: boolean;
  networkKey?: string;
  handlerInputAddress?: () => void;
  isStopMultitimeExecution?: boolean;
}

type ExportedType = React.ComponentType<Props> & {
  createOption: (option: KeyringSectionOption, isUppercase?: boolean) => Option;
  setLastValue: (type: KeyringOption$Type, value: string) => void;
};

interface State {
  lastValue?: string;
  value?: string | string[];
}

const STORAGE_KEY = 'options:InputAddress';
const DEFAULT_TYPE = 'all';

function transformToAddress (value?: string | Uint8Array | null): string | null {
  try {
    return toAddress(value) || null;
  } catch (error) {
    // noop, handled by return
  }

  return null;
}

function transformToAccountId (value: string): string | null {
  if (!value) {
    return null;
  }

  const accountId = transformToAddress(value);

  return !accountId
    ? null
    : accountId;
}

function createOption (address: string): Option {
  let isRecent: boolean | undefined;
  const pair = keyring.getAccount(address);
  let name: string | undefined;

  if (pair) {
    name = pair.meta.name;
  } else {
    const addr = keyring.getAddress(address);

    if (addr) {
      name = addr.meta.name;
      isRecent = addr.meta.isRecent;
    } else {
      isRecent = true;
    }
  }

  return createItem(createOptionItem(address, name), !isRecent);
}

function readOptions (): Record<string, Record<string, string>> {
  return store.get(STORAGE_KEY) as Record<string, Record<string, string>> || { defaults: {} };
}

function getLastValue (type: KeyringOption$Type = DEFAULT_TYPE): string {
  const options = readOptions();

  return options.defaults[type];
}

function setLastValue (type: KeyringOption$Type = DEFAULT_TYPE, value: string): void {
  const options = readOptions();

  options.defaults[type] = value;
  store.set(STORAGE_KEY, options);
}

function dedupe (options: Option[]): Option[] {
  return options.reduce<Option[]>((all, o, index) => {
    const hasDupe = all.some(({ key }, eindex) =>
      eindex !== index &&
      key === o.key
    );

    if (!hasDupe) {
      all.push(o);
    }

    return all;
  }, []);
}

class InputAddress extends React.PureComponent<Props, State> {
  public override state: State = {};

  public static getDerivedStateFromProps ({ type, value }: Props, { lastValue }: State): Pick<State, never> | null {
    try {
      return {
        lastValue: lastValue || getLastValue(type),
        value: Array.isArray(value)
          ? value.map((v) => toAddress(v))
          : (toAddress(value) || undefined)
      };
    } catch (error) {
      return null;
    }
  }

  public override render (): React.ReactNode {
    const { className = '', defaultValue, help, hideAddress = false, isDisabled = false, isError, label, labelExtra, options, optionsAll, placeholder, type = DEFAULT_TYPE, withEllipsis, withLabel, autoPrefill = true } = this.props;

    const hasOptions = (options && options.length !== 0) || (optionsAll && Object.keys(optionsAll[type]).length !== 0);

    // the options could be delayed, don't render without
    if (!hasOptions && !isDisabled) {
      // This is nasty, but since this things is non-functional, there is not much
      // we can do (well, wrap it, however that approach is deprecated here)
      return (
        <Static
          className={className}
          help={help}
          label={label}
        >
          No accounts are available for selection.
        </Static>
      );
    }

    const { lastValue, value } = this.state;
    const lastOption = this.getLastOptionValue();
    const actualValue = transformToAddress(
      isDisabled || (defaultValue && this.hasValue(defaultValue))
        ? defaultValue
        : this.hasValue(lastValue)
          ? lastValue
          : (lastOption && lastOption.value)
    );

    const actualOptions: Option[] = options
      ? dedupe(options.map((o) => createItem(o)))
      : isDisabled && actualValue
        ? [createOption(actualValue)]
        : this.getFiltered();
    const _defaultValue = ((!autoPrefill && !isDisabled) || !isUndefined(value))
      ? undefined
      : actualValue;

    return (
      <Dropdown
        className={`ui--InputAddress${hideAddress ? ' hideAddress' : ''} ${className}`}
        defaultValue={_defaultValue}
        dropdownClassName='ui--AddressSearch'
        help={help}
        isDisabled={isDisabled}
        isError={isError}
        label={label}
        labelExtra={labelExtra}
        onChange={this.onChange}
        onSearch={this.onSearch}
        options={actualOptions}
        placeholder={placeholder}
        value={value}
        withEllipsis={withEllipsis}
        withLabel={withLabel}
      />
    );
  }

  private getLastOptionValue (): KeyringSectionOption | undefined {
    const available = this.getFiltered();

    return available.length
      ? available[available.length - 1]
      : undefined;
  }

  private hasValue (test?: Uint8Array | string | null): boolean {
    return this.getFiltered().some(({ value }) => test === value);
  }

  private getFiltered (): Option[] {
    const { filter, optionsAll, isEthereum, type = DEFAULT_TYPE, networkKey, addresses, handlerInputAddress, isStopMultitimeExecution } = this.props;

    // console.log('WatchTEST1 first in the getFiltered readOptions() is : ', readOptions());

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions

    let options: Option[] = [];

    if (optionsAll) {
      if (networkKey === 'astar' || networkKey === 'astarEvm' || networkKey === 'shiden' || networkKey === 'shidenEvm') {
        if (networkKey === 'astarEvm' || networkKey === 'shidenEvm') {
          // console.log('WatchTEST2 optionsAll[type] is: ', optionsAll[type]);
          // console.log('WatchTEST3 addresses is: ', addresses);

          const MatchResultWhetherContainingNotThisWalletSS58Address = optionsAll[type].map((opt) => {
            // console.log('WatchTEST4 opt.key is: ', opt.key);

            return Boolean(
              opt.key && isValidAddressPolkadotAddress(opt.key) && addresses && !addresses.includes(opt.key)
            );
          });

          // console.log('WatchTEST5 MatchResultWhetherContainingNotThisWalletSS58Address is: ', MatchResultWhetherContainingNotThisWalletSS58Address);

          const isContainNotThisWalletSS58Address = MatchResultWhetherContainingNotThisWalletSS58Address.includes(true);

          const lastOption = Object.values(optionsAll[type])[Object.keys(optionsAll[type]).length - 1].key;

          // console.log('WatchTEST6 isContainNotThisWalletSS58Address: ', isContainNotThisWalletSS58Address);
          // console.log('WatchTEST7 lastOption', lastOption);

          if (lastOption) {
            if (!isValidEvmAddress(lastOption) && isContainNotThisWalletSS58Address) {
              // console.log('WatchTEST beforePOP readOptions() is : ', readOptions());
              // this.setState(() => {
              //   return { lastValue: lastOption };
              // });

              // console.log('WatchTEST lastValue is: ', this.state.lastValue);

              // console.log('WatchTEST8 optionsAll is: ', optionsAll);
              // console.log('WatchTEST allState', allState);

              // console.log('WatchTEST lastValue is ', lastValue, 'value is ', value);
              // setLastValue(type, '');
              const popValues = [optionsAll[type].pop(), optionsAll.address.pop(), optionsAll.all.pop(), optionsAll.recent.pop()];
              // optionsAll[type].pop();
              // optionsAll.address.pop();
              // optionsAll.all.pop();
              // optionsAll.recent.pop();
              // allState = this.state;

              console.log('WatchTEST9 popValues: ', popValues);

              // if (popValues[0]?.key) {
              //   this.setState(
              //     { value: popValues[0] && popValues[0].key }
              //   );
              // }

              // console.log('WatchTEST getLastValue is', getLastValue('all'));

              // console.log('WatchTEST lastValue is ', this.state.lastValue, 'value is ', this.state.value);

              // console.log('WatchTEST10 pop()!!!!!!!!!!!!');

              // console.log('WatchTEST lastValue is ', this.state.lastValue, 'value is ', this.state.value);
              // console.log('WatchTEST11 optionsAll is: ', optionsAll);
              // console.log('WatchTEST allState', allState);

              // console.log('WatchTEST12 afterPOP readOptions() is : ', readOptions());

              if (handlerInputAddress && (isStopMultitimeExecution === false)) {
                // console.log('WatchTEST13 hello!! optionsAll[type]', optionsAll[type]);
                handlerInputAddress();
              }
            }
          }

          // console.log('WatchTEST14 before options assign readOptions() is : ', readOptions());

          options = optionsAll[type].filter((opt) => (opt.key && (isValidEvmAddress(opt.key) || (addresses && addresses.includes(opt.key)) || opt.key === 'header-accounts')));
        } else {
          options = optionsAll[type].filter((opt) => (opt.key && (isValidEvmAddress(opt.key) || isValidAddressPolkadotAddress(opt.key) || opt.key === 'header-accounts')));
        }
      } else {
        if (isEthereum) {
          options = optionsAll[type].filter((opt) => opt.key && (opt.key.includes('0x') || opt.key === 'header-accounts'));
        } else {
          options = optionsAll[type].filter((opt) => opt.key && (!opt.key.includes('0x') || opt.key === 'header-accounts'));
        }
      }
    }

    return !optionsAll
      ? []
      : dedupe(options).filter(({ value }) => !filter || (!!value && filter.includes(value)));
  }

  private onChange = (address: string): void => {
    const { addresses, filter, networkKey, onChange, type } = this.props;

    // console.log('WatchTEST15 onChange address is: ', address);

    if (networkKey === 'astarEvm' || networkKey === 'shidenEvm') {
      if (addresses && !isValidEvmAddress(address) && !addresses.includes(address)) {
        // console.log('WatchTEST16 onChange!!!!!!!!!!!!!!!!!!!!!!!!!!! return');
      }
    }
    // console.log('WatchTEST17 onChange!!!!!!!!!!!!!!!!!!!!!!!!!! NOT return');

    // if (isValidEvmAddress(address) || (addresses && addresses.includes(address))) {
    !filter && setLastValue(type, address);
    // }

    // console.log('WatchTest address is: ', address);
    // console.log('WatchTest transformToAccountId(address) is: ', transformToAccountId(address));

    // if (networkKey === 'astarEvm' || networkKey === 'shidenEvm' || networkKey === 'shibuyaEvm') {
    //   onChange && onChange(
    //     this.hasValue(address)
    //       ? address
    //       : null
    //   );
    // } else {
    onChange && onChange(
      this.hasValue(address)
        ? transformToAccountId(address)
        : null
    );
    // }
  };

  private onSearch = (filteredOptions: KeyringSectionOptions, _query: string): KeyringSectionOptions => {
    const { isInput = true } = this.props;
    const query = _query.trim();
    const queryLower = query.toLowerCase();
    const matches = filteredOptions.filter((item): boolean =>
      !!item.value && (
        (item.name.toLowerCase && item.name.toLowerCase().includes(queryLower)) ||
        item.value.toLowerCase().includes(queryLower)
      )
    );

    if (isInput && matches.length === 0) {
      const accountId = transformToAccountId(query);

      if (accountId) {
        matches.push(
          keyring.saveRecent(
            accountId.toString()
          ).option
        );
      }
    }

    return matches.filter((item, index): boolean => {
      const isLast = index === matches.length - 1;
      const nextItem = matches[index + 1];
      const hasNext = nextItem && nextItem.value;

      return !(isNull(item.value) || isUndefined(item.value)) || (!isLast && !!hasNext);
    });
  };
}

const ExportedComponent = withMulti(
  styled(InputAddress)(({ theme }: ThemeProps) => `
  padding-left: 60px;
  padding-right: 10px;
  display: flex;
  align-items: flex-start;
  background: rgba(40, 42, 55, 1);

  position: relative;
  border: 1px solid rgba(79, 88, 127, 1);
  height: 60px;
  z-index: 3;
  border-radius: 8px;

  > label, .labelExtra {
    position: relative;
  }

  > label {
    flex: 1;
    font-size: 15px;
    font-weight: 500;
    color: ${theme.textColor2};
    display: flex;
    align-items: center;
    overflow: hidden;
    margin-right: 10px;
  }

  .labelExtra {

  }

  .ui--Labelled-content {
  }

  .ui--FormatBalance {
    font-weight: 400;
    font-size: 14px;
    color: ${theme.textColor};
  }

  .ui--FormatBalance-postfix {
    color: ${theme.textColor2};
  }

  .ui--AddressSearch {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }

  .ui--AddressSearch > input,
  .text > .ui--KeyPair {
    padding: 0px 49px 0px 88px;
  }

  .ui--AddressSearch > input {
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
    outline: none;
    background: transparent;
    position: relative;
    z-index: 2;
    font-size: 18px;
    color: ${theme.textColor};
  }

  .ui--KeyPair-icon .icon {
    width: 100%;
    height: 100%;

    svg, img {
      width: 100%;
      height: 100%;
    }
  }

  .ui--AddressSearch > .text {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    z-index: 2;

    &.filtered {
      display: none;
    }

    &:before {
      content: '';
      height: 36px;
      width: 36px;
      display: block;
      position: absolute;
      z-index: -1;
      top: 12px;
      bottom: 12px;
      left: 24px;
      border-radius: 100%;
      background: ${theme.backgroundAccountAddress};
    }
  }

  .ui--KeyPair {
    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .text > .ui--KeyPair {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    border-radius: 8px;
    background-color: transparent;

    .ui--KeyPair-icon {
      position: absolute;
      width: 36px;
      height: 36px;
      left: 24px;
      top: 12px;
    }

    .name, .address {
      cursor: text;
    }

    .name {
      position: absolute;
      top :8px;

      font-family: 'Roboto';
      font-style: normal;
      font-weight: 700;
      font-size: 16px;
      line-height: 100%;
    }

    .address {
      position: absolute;
      bottom: 8px;
      margin-top:4px;
      font-family: 'Roboto';
      font-style: normal;
      font-weight: 700;
      font-size: 12px;
      line-height: 100%;
      /* identical to box height, or 12px */
      
      display: flex;
      align-items: center;
      
      color: #FFFFFF;
    }
  }

  .ui--AddressSearch.visible {
    z-index: 7;

    > .text {
      opacity: 0.5;
    }
  }

  .ui--AddressSearch .menu {
    display: none;
    user-select: none;
    top: 100%;
    position: absolute;
    right: 0;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    -webkit-overflow-scrolling: touch;
    outline: 0;
    margin: 0 -2px;
    min-width: calc(100% + 4px);
    width: calc(100% + 2px);
    //box-shadow: 0 2px 3px 0 rgb(34 36 38 / 15%);
    box-shadow: ${theme.boxShadow2};
    -webkit-transition: opacity .1s ease;
    transition: opacity .1s ease;
    background: ${theme.background};
    font-size: 15px;
    border-radius: 8px;
  }

  .ui--AddressSearch .menu.visible {
    display: block;
  }

  .ui--AddressSearch .menu .header {
    padding: 8px 16px;
    text-transform: uppercase;
    color: ${theme.textColor};
    font-weight: 500;
    background-color: ${theme.background};
  }

  .ui--AddressSearch .menu .message {
      padding: 8px 16px;
  }

  .ui--AddressSearch .menu .item {
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
  }

  .ui--AddressSearch .menu .item.selected {
    background: ${theme.backgroundAccountAddress};
    color: ${theme.textColor};
    font-weight: 500;
  }

  .ui--AddressSearch .menu .item:hover {
    .ui--KeyPair .name {
      color: ${theme.textColor};
    }
  }

  .ui--AddressSearch .menu .ui--KeyPair {
    display: flex;
    align-items: center;
    color: ${theme.textColor2};

    .ui--KeyPair-icon {
      min-width: 24px;
      width: 24px;
      height: 24px;
      margin-right: 16px;
    }

    .name {
      flex: 1;
    }
  }

  .ui--AddressSearch .menu .item.selected {
    .ui--KeyPair .name {
      color: ${theme.textColor2};
      font-weight: 500;
    }
  }

  &.isDisabled {
    border-style: dashed;
  }

    @media only screen and (min-width: 768px) {
      .ui--AddressSearch .menu {
        max-height: 150px;
      }
    }

    @media only screen and (min-width: 992px) {
      .ui--AddressSearch .menu {
        max-height: 225px;
      }
    }

    @media only screen and (min-width: 1920px) {
      .ui--AddressSearch .menu {
        max-height: 300px;
      }
    }


    @media (max-width: 767px) {
      .ui--AddressSearch .menu {
        max-height: 130px;
      }
    }
  }
  `),
  withObservable(keyring.keyringOption.optionsSubject, {
    propName: 'optionsAll',
    transform: (optionsAll: KeyringOptions): Record<string, (Option | React.ReactNode)[]> =>
      Object.entries(optionsAll).reduce((result: Record<string, (Option | React.ReactNode)[]>, [type, options]): Record<string, (Option | React.ReactNode)[]> => {
        result[type] = options.map((option): Option | React.ReactNode =>
          option.value === null
            ? createHeader(option)
            : createItem(option)
        );

        return result;
      }, {})
  })
) as ExportedType;

ExportedComponent.createOption = createItem;
ExportedComponent.setLastValue = setLastValue;

export default ExportedComponent;
