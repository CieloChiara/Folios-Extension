// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ValidatorInfo } from '@subwallet/extension-base/background/KoniTypes';
import { ActionContext, InputFilter } from '@subwallet/extension-koni-ui/components';
import Spinner from '@subwallet/extension-koni-ui/components/Spinner';
import useTranslation from '@subwallet/extension-koni-ui/hooks/useTranslation';
import { getBondingOptions } from '@subwallet/extension-koni-ui/messaging';
import Header from '@subwallet/extension-koni-ui/partials/Header';
import ValidatorItem from '@subwallet/extension-koni-ui/Popup/Bonding/components/ValidatorItem';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';

interface Props extends ThemeProps {
  className?: string;
}

function BondingValidatorSelection ({ className }: Props): React.ReactElement<Props> {
  const { t } = useTranslation();
  const { bondingParams } = useSelector((state: RootState) => state);
  const navigate = useContext(ActionContext);
  const [searchString, setSearchString] = useState('');
  const [loading, setLoading] = useState(true);
  const [maxNominatorPerValidator, setMaxNominatorPerValidator] = useState(0);
  const [allValidators, setAllValidators] = useState<ValidatorInfo[]>([]);

  const [sortByCommission, setSortByCommission] = useState(false);
  const [sortByReturn, setSortByReturn] = useState(false);

  const _height = window.innerHeight > 600 ? 650 : 300;

  const handleSortByCommission = useCallback(() => {
    if (!sortByCommission) {
      setSortByReturn(false);
    }

    setSortByCommission(!sortByCommission);
  }, [sortByCommission]);

  const handleSortByReturn = useCallback(() => {
    if (!sortByReturn) {
      setSortByCommission(false);
    }

    setSortByReturn(!sortByReturn);
  }, [sortByReturn]);

  const filterValidators = useCallback(() => {
    const _filteredValidators: ValidatorInfo[] = [];

    allValidators.forEach((validator) => {
      if (validator.address.toLowerCase().includes(searchString.toLowerCase()) || (validator.identity && validator.identity.toLowerCase().includes(searchString.toLowerCase()))) {
        _filteredValidators.push(validator);
      }
    });

    if (sortByReturn) {
      return _filteredValidators
        .sort((validator: ValidatorInfo, _validator: ValidatorInfo) => {
          if (validator.expectedReturn > _validator.expectedReturn) {
            return -1;
          } else if (validator.expectedReturn <= _validator.expectedReturn) {
            return 1;
          }

          return 0;
        });
    } else if (sortByCommission) {
      return _filteredValidators
        .sort((validator: ValidatorInfo, _validator: ValidatorInfo) => {
          if (validator.commission <= _validator.commission) {
            return -1;
          } else if (validator.commission > _validator.commission) {
            return 1;
          }

          return 0;
        });
    }

    return _filteredValidators;
  }, [allValidators, searchString, sortByCommission, sortByReturn]);

  const filteredValidators = filterValidators();

  const _onChangeFilter = useCallback((val: string) => {
    setSearchString(val);
  }, []);

  useEffect(() => {
    if (bondingParams.selectedNetwork === null) {
      navigate('/account/select-bonding-network');
    } else {
      getBondingOptions(bondingParams.selectedNetwork)
        .then((bondingOptionInfo) => {
          setMaxNominatorPerValidator(bondingOptionInfo.maxNominatorPerValidator);
          const sortedValidators = bondingOptionInfo.validators
            .sort((validator: ValidatorInfo, _validator: ValidatorInfo) => {
              if (validator.isVerified && !_validator.isVerified) {
                return -1;
              } else if (!validator.isVerified && _validator.isVerified) {
                return 1;
              }

              return 0;
            });

          setAllValidators(sortedValidators);
          setLoading(false);
        })
        .catch(console.error);
    }
  }, []);

  const handleClickHelper = useCallback(() => {
    // eslint-disable-next-line no-void
    void chrome.tabs.create({ url: 'https://support.polkadot.network/support/solutions/articles/65000150130-how-do-i-know-which-validators-to-choose-', active: true }).then(() => console.log('redirecting'));
  }, []);

  return (
    <div className={className}>
      <Header
        showBackArrow
        showSubHeader
        subHeaderName={t<string>('Select a validator')}
        to='/account/select-bonding-network'
      >
        <div className={'bonding-input-filter-container'}>
          <InputFilter
            onChange={_onChangeFilter}
            placeholder={t<string>('Search validator...')}
            value={searchString}
            withReset
          />
        </div>
      </Header>

      <div className='bonding__button-area'>
        <div
          className={`${sortByCommission ? 'active-bonding__btn' : 'bonding__btn'}`}
          onClick={handleSortByCommission}
        >
          {t<string>('Lowest commission')}
        </div>
        <div
          className={`${sortByReturn ? 'active-bonding__btn' : 'bonding__btn'} sort-return-btn`}
          onClick={handleSortByReturn}
        >
          {t<string>('Highest return')}
        </div>
      </div>

      <div
        className={'validator-list'}
        style={{ height: `${_height}px` }}
      >
        {
          loading && <Spinner />
        }
        {
          !loading && filteredValidators.map((validator, index) => {
            return <ValidatorItem
              key={`${index}-${validator.address}`}
              maxNominatorPerValidator={maxNominatorPerValidator}
              networkKey={bondingParams.selectedNetwork}
              validatorInfo={validator}
            />;
          })
        }
      </div>

      <div
        className={'validator-selection-helper'}
        onClick={handleClickHelper}
      >
        How do I know which validators to choose?
      </div>
    </div>
  );
}

export default React.memo(styled(BondingValidatorSelection)(({ theme }: Props) => `
  .sort-return-btn:before {
    content: '';
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: ${theme.textColor2};
    top: 0;
    bottom: 0;
    left: 7px;
    margin: auto 0;
  }

  .sort-return-btn {
    padding-left: 20px;
  }

  .validator-selection-helper {
    margin-left: 15px;
    margin-top: 15px;
    cursor: pointer;
    font-size: 14px;
    color: ${theme.textColor3};
  }

  .validator-selection-helper:hover {
    text-decoration: underline;
  }

  .bonding__btn {
    cursor: pointer;
    position: relative;
    font-size: 14px;
    color: ${theme.textColor2};
  }

  .active-bonding__btn {
    cursor: pointer;
    position: relative;
    font-size: 14px;
    color: ${theme.textColor3};
  }

  .bonding__btn:hover {
    color: ${theme.textColor3};
  }

  .bonding__button-area {
    display: flex;
    justify-content: flex-end;
    padding: 10px 15px;
  }

  .bonding-input-filter-container {
    padding: 0 15px 12px;
  }

  .validator-list {
    margin-top: 10px;
    padding-top: 5px;
    padding-bottom: 5px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-left: 15px;
    padding-right: 15px;
    overflow-y: scroll;
  }
`));
