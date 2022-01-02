// Copyright 2019-2021 @polkadot/extension-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { ThemeProps } from '../../types';

import React from 'react';
import styled from 'styled-components';

interface Props extends ThemeProps {
  children: React.ReactNode;
  className?: string;
  noBorder?: boolean;
  title?: React.ReactNode;
}

function MenuItem ({ children, className = '', title }: Props): React.ReactElement<Props> {
  return (
    <div className={`${className}${title ? ' isTitled' : ''}`}>
      {title && (
        <div className='itemTitle'>{title}</div>
      )}
      {children}
    </div>
  );
}

export default styled(MenuItem)(({ theme }: ThemeProps) => `
  padding: 0 16px;
  max-width: 100%;
  margin-top: 14px;
  flex: 1;

  > .itemTitle {
    margin: 0;
    width: 100%;
    font-size: ${theme.inputLabelFontSize};
    line-height: 26px;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: ${theme.textColor2};
    font-family: ${theme.fontFamilyRegular};
  }

  // &+&.isTitled {
  //   margin-top: 16px;
  // }
`);