import React from "react";
import cx from "classnames";
import Creatable from "react-select/creatable";
import { useIntl } from "react-intl";
import { getCountries } from "src/utils/country";
import { CountryLabel } from "./CountryLabel";
import { PatchComponent } from "src/patch";
import {
  QuietInput,
  QuietMenuList,
  QuietSelectContext,
  useQuietSelect,
} from "./FilterSelect";

interface IProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  showFlag?: boolean;
  isClearable?: boolean;
  menuPortalTarget?: HTMLElement | null;
}

const _CountrySelect: React.FC<IProps> = ({
  value,
  onChange,
  disabled = false,
  isClearable = true,
  showFlag,
  className,
  menuPortalTarget,
}) => {
  const { locale } = useIntl();
  const quiet = useQuietSelect(disabled || !onChange);
  const options = getCountries(locale);
  const selected = options.find((opt) => opt.value === value) ?? {
    label: value,
    value,
  };

  return (
    <QuietSelectContext.Provider value={quiet.api}>
      <div
        className={cx("react-select-anchor", quiet.picking && "is-picking")}
        ref={quiet.anchorRef}
        onPointerDownCapture={quiet.onPointerDownCapture}
        onMouseDownCapture={quiet.blockControlFocus}
        onTouchEndCapture={quiet.blockControlFocus}
        onClickCapture={quiet.blockControlFocus}
      >
        <Creatable
          classNamePrefix="react-select"
          value={selected}
          isClearable={isClearable}
          formatOptionLabel={(option) => (
            <CountryLabel country={option.value} showFlag={showFlag} />
          )}
          placeholder="Country"
          options={options}
          onChange={(selectedOption) => onChange?.(selectedOption?.value ?? "")}
          isDisabled={disabled || !onChange}
          isMulti={false}
          menuIsOpen={quiet.menuIsOpen}
          onMenuOpen={quiet.onMenuOpen}
          onMenuClose={quiet.onMenuClose}
          components={{
            IndicatorSeparator: null,
            Input: QuietInput,
            MenuList: QuietMenuList,
          }}
          className={`CountrySelect ${className}`}
          menuPortalTarget={menuPortalTarget}
        />
      </div>
    </QuietSelectContext.Provider>
  );
};

export const CountrySelect = PatchComponent("CountrySelect", _CountrySelect);
