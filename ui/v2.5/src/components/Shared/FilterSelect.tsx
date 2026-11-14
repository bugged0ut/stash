import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useIntl } from "react-intl";
import {
  components as ReactSelectComponents,
  InputProps,
  MenuListProps,
  OnChangeValue,
  StylesConfig,
  GroupBase,
  OptionsOrGroups,
  Options,
} from "react-select";
import AsyncSelect from "react-select/async";
import AsyncCreatableSelect, {
  AsyncCreatableProps,
} from "react-select/async-creatable";
import cx from "classnames";

import { useToast } from "src/hooks/Toast";
import { useDebounce } from "src/hooks/debounce";
import { IHasID } from "src/utils/data";
import { useMediaQuery } from "src/utils/screen";

export type Option<T> = { value: string; object: T };

interface ISelectProps<T, IsMulti extends boolean>
  extends AsyncCreatableProps<Option<T>, IsMulti, GroupBase<Option<T>>> {
  selectedOptions?: OnChangeValue<Option<T>, IsMulti>;
  creatable?: boolean;
  isLoading?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
  showDropdown?: boolean;
  groupHeader?: string;
  noOptionsMessageText?: string | null;
}

interface IFilterSelectProps<T, IsMulti extends boolean>
  extends Pick<
    ISelectProps<T, IsMulti>,
    | "selectedOptions"
    | "isLoading"
    | "isMulti"
    | "components"
    | "placeholder"
    | "closeMenuOnSelect"
  > {}

const getSelectedItems = <T,>(
  selectedItems: OnChangeValue<Option<T>, boolean>
) => {
  if (Array.isArray(selectedItems)) {
    return selectedItems;
  } else if (selectedItems) {
    return [selectedItems];
  } else {
    return [];
  }
};

interface IQuietSelectApi {
  coarse: boolean;
  typing: boolean;
  label: string;
  beginTyping: (event: React.SyntheticEvent) => void;
  blockInputFocus: (event: React.FocusEvent<HTMLInputElement>) => void;
}

export const QuietSelectContext = React.createContext<IQuietSelectApi | null>(
  null
);

// A focused text input opens the phone keyboard. Keep the field unfocused
// until "Type to search" so the suggestion list can use the screen.
export function useQuietSelect(isDisabled = false, onMenuClose?: () => void) {
  const intl = useIntl();
  const touch = useMediaQuery("(pointer: coarse), (hover: none)");
  const [typing, setTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef({ coarse: touch, typing });
  const disabledRef = useRef(isDisabled);
  const ignoreCloseRef = useRef(false);
  const onMenuCloseRef = useRef(onMenuClose);
  liveRef.current.coarse = touch;
  liveRef.current.typing = typing;
  disabledRef.current = isDisabled;
  onMenuCloseRef.current = onMenuClose;

  const closeMenu = () => {
    setMenuOpen(false);
    liveRef.current.typing = false;
    setTyping(false);
    onMenuCloseRef.current?.();
  };

  useEffect(() => {
    if (!touch || typing) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!menuOpen) return;
      const { target } = event;
      if (!(target instanceof Element)) return;
      if (target.closest(".react-select-type-toggle")) return;
      if (target.closest(".react-select__menu")) return;
      if (anchorRef.current?.contains(target)) return;
      closeMenu();
    };

    // Tapping the open menu focuses the search field. Stop that while the
    // field is not in typing mode so the keyboard stays closed. Clicks still
    // select an option.
    const stopMenuFocus = (event: Event) => {
      const { target } = event;
      if (!(target instanceof Element)) return;
      if (target.closest(".react-select-type-toggle")) return;
      const menu = target.closest(".react-select__menu");
      if (!menu) return;
      const listId = anchorRef.current
        ?.querySelector("input")
        ?.getAttribute("aria-controls");
      const list = listId ? document.getElementById(listId) : null;
      if (!list || !menu.contains(list)) return;
      // preventDefault on touchend cancels the click that selects an option.
      if (event.type !== "touchend") event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("mousedown", stopMenuFocus, true);
    document.addEventListener("touchend", stopMenuFocus, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("mousedown", stopMenuFocus, true);
      document.removeEventListener("touchend", stopMenuFocus, true);
    };
    // closeMenu reads refs, so it stays current without being a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen, touch, typing]);

  const pickTarget = (event: React.SyntheticEvent) => {
    if (
      !liveRef.current.coarse ||
      liveRef.current.typing ||
      disabledRef.current
    ) {
      return null;
    }
    const { target } = event;
    if (!(target instanceof Element)) return null;
    if (target.closest(".react-select__menu")) return null;
    if (
      target.closest(
        ".react-select__clear-indicator, .react-select__multi-value__remove"
      )
    ) {
      return null;
    }
    return target.closest(".react-select__control");
  };

  const api: IQuietSelectApi = {
    get coarse() {
      return liveRef.current.coarse;
    },
    get typing() {
      return liveRef.current.typing;
    },
    label: intl.formatMessage({
      id: "actions.type_to_search",
      defaultMessage: "Type to search",
    }),
    beginTyping: (event) => {
      event.preventDefault();
      event.stopPropagation();
      liveRef.current.typing = true;
      setTyping(true);
      setMenuOpen(true);
      const input = anchorRef.current?.querySelector("input");
      if (input) {
        input.readOnly = false;
        input.inputMode = "text";
        input.focus();
      }
    },
    blockInputFocus: (event) => {
      ignoreCloseRef.current = true;
      event.currentTarget.blur();
    },
  };

  return {
    api,
    picking: touch && !typing,
    anchorRef,
    menuIsOpen: touch ? menuOpen : undefined,
    onMenuOpen: () => setMenuOpen(true),
    onMenuClose: () => {
      if (ignoreCloseRef.current) {
        ignoreCloseRef.current = false;
        setMenuOpen(true);
        return;
      }
      closeMenu();
    },
    onPointerDownCapture: (event: React.PointerEvent) => {
      if (!pickTarget(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setMenuOpen((open) => !open);
    },
    blockControlFocus: (event: React.SyntheticEvent) => {
      if (!pickTarget(event)) return;
      event.preventDefault();
      event.stopPropagation();
    },
  };
}

export function QuietTypeToggle() {
  const api = useContext(QuietSelectContext);
  if (!api?.coarse || api.typing) return null;
  return (
    <button
      type="button"
      className="react-select-type-toggle"
      onPointerDown={api.beginTyping}
    >
      {api.label}
    </button>
  );
}

export function QuietInput<
  Opt,
  IsMulti extends boolean,
  Group extends GroupBase<Opt>
>(inputProps: InputProps<Opt, IsMulti, Group>) {
  const api = useContext(QuietSelectContext);
  const allowType = !api?.coarse || api.typing;
  const Input = ReactSelectComponents.Input as React.ComponentType<
    InputProps<Opt, IsMulti, Group> & {
      readOnly?: boolean;
      inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
      onFocus?: React.FocusEventHandler<HTMLInputElement>;
    }
  >;
  return (
    <Input
      {...inputProps}
      readOnly={!allowType}
      inputMode={allowType ? "text" : "none"}
      onFocus={(event) => {
        const typingNow = Boolean(api?.typing);
        if (api?.coarse && !typingNow) {
          api.blockInputFocus(event);
          return;
        }
        inputProps.onFocus?.(event);
      }}
    />
  );
}

export function QuietMenuList<
  Opt,
  IsMulti extends boolean,
  Group extends GroupBase<Opt>
>(menuProps: MenuListProps<Opt, IsMulti, Group>) {
  return (
    <ReactSelectComponents.MenuList {...menuProps}>
      <QuietTypeToggle />
      {menuProps.children}
    </ReactSelectComponents.MenuList>
  );
}

const SelectComponent = <T, IsMulti extends boolean>(
  props: ISelectProps<T, IsMulti>
) => {
  const {
    selectedOptions,
    isDisabled = false,
    creatable = false,
    components,
    placeholder,
    showDropdown = true,
    noOptionsMessageText: noOptionsMessage = "None",
  } = props;
  const quiet = useQuietSelect(isDisabled, props.onMenuClose);

  const styles: StylesConfig<Option<T>, IsMulti> = {
    option: (base) => ({
      ...base,
      color: "#000",
    }),
    container: (base, state) => ({
      ...base,
      zIndex: state.isFocused ? 10 : base.zIndex,
    }),
    multiValueRemove: (base, state) => ({
      ...base,
      color: state.isFocused ? base.color : "#333333",
    }),
  };

  const componentProps = {
    ...props,
    styles,
    defaultOptions: true,
    isClearable: true,
    value: selectedOptions ?? null,
    className: cx("react-select", props.className),
    classNamePrefix: "react-select",
    noOptionsMessage: () => noOptionsMessage,
    placeholder: isDisabled ? "" : placeholder,
    components: {
      ...components,
      Input: QuietInput,
      MenuList: QuietMenuList,
      IndicatorSeparator: () => null,
      ...((!showDropdown || isDisabled) && { DropdownIndicator: () => null }),
      ...(isDisabled && { MultiValueRemove: () => null }),
    },
    menuIsOpen: quiet.menuIsOpen,
    onMenuOpen: () => {
      quiet.onMenuOpen();
      props.onMenuOpen?.();
    },
    onMenuClose: quiet.onMenuClose,
  };

  const select = creatable ? (
    <AsyncCreatableSelect {...componentProps} isDisabled={isDisabled} />
  ) : (
    <AsyncSelect {...componentProps} />
  );

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
        {select}
      </div>
    </QuietSelectContext.Provider>
  );
};

export interface IFilterValueProps<T> {
  values?: T[];
  onSelect?: (item: T[]) => void;
}

export interface IFilterProps {
  noSelectionString?: string;
  className?: string;
  active?: boolean;
  isMulti?: boolean;
  isClearable?: boolean;
  isDisabled?: boolean;
  creatable?: boolean;
  menuPortalTarget?: HTMLElement | null;
}

export interface IFilterComponentProps<T> extends IFilterProps {
  loadOptions: (inputValue: string) => Promise<Option<T>[]>;
  onCreate?: (
    name: string
  ) => Promise<{ value: string; item: T; message: string }>;
  getNamedObject?: (id: string, name: string) => T;
  isValidNewOption?: (inputValue: string, options: T[]) => boolean;
}

export const FilterSelectComponent = <
  T extends IHasID,
  IsMulti extends boolean
>(
  props: IFilterValueProps<T> &
    IFilterComponentProps<T> &
    IFilterSelectProps<T, IsMulti>
) => {
  const {
    values,
    isMulti,
    onSelect,
    creatable = false,
    isValidNewOption,
    getNamedObject,
    loadOptions,
  } = props;
  const [loading, setLoading] = useState(false);
  const Toast = useToast();

  const selectedOptions = useMemo(() => {
    if (isMulti && values) {
      return values.map(
        (value) =>
          ({
            object: value,
            value: value.id,
          } as Option<T>)
      ) as unknown as OnChangeValue<Option<T>, IsMulti>;
    }

    if (values?.length) {
      return {
        object: values[0],
        value: values[0].id,
      } as OnChangeValue<Option<T>, IsMulti>;
    }
  }, [values, isMulti]);

  const onChange = (selectedItems: OnChangeValue<Option<T>, boolean>) => {
    const selected = getSelectedItems(selectedItems);

    onSelect?.(selected.map((item) => item.object));
  };

  const onCreate =
    creatable && props.onCreate
      ? async (name: string) => {
          try {
            setLoading(true);
            const {
              value,
              item: newItem,
              message,
            } = await props.onCreate!(name);
            const newItemOption = {
              object: newItem,
              value,
            } as Option<T>;
            if (!isMulti) {
              onChange(newItemOption);
            } else {
              const o = (selectedOptions ?? []) as Option<T>[];
              onChange([...o, newItemOption]);
            }

            setLoading(false);
            Toast.success(
              <span>
                {message}: <b>{name}</b>
              </span>
            );
          } catch (e) {
            Toast.error(e);
          }
        }
      : undefined;

  const getNewOptionData =
    creatable && getNamedObject
      ? (inputValue: string, optionLabel: React.ReactNode) => {
          return {
            value: "",
            object: getNamedObject("", optionLabel as string),
          };
        }
      : undefined;

  const validNewOption =
    creatable && isValidNewOption
      ? (
          inputValue: string,
          value: Options<Option<T>>,
          options: OptionsOrGroups<Option<T>, GroupBase<Option<T>>>
        ) => {
          return isValidNewOption(
            inputValue,
            (options as Options<Option<T>>).map((o) => o.object)
          );
        }
      : undefined;

  const debounceDelay = 100;
  const debounceLoadOptions = useDebounce((inputValue, callback) => {
    loadOptions(inputValue).then(callback);
  }, debounceDelay);

  return (
    <SelectComponent<T, IsMulti>
      {...props}
      loadOptions={debounceLoadOptions}
      isLoading={props.isLoading || loading}
      onChange={onChange}
      selectedOptions={selectedOptions}
      onCreateOption={onCreate}
      getNewOptionData={getNewOptionData}
      isValidNewOption={validNewOption}
    />
  );
};

export interface IFilterIDProps<T> {
  ids?: string[];
  onSelect?: (item: T[]) => void;
}

export function toOption<T extends IHasID>(item: T): Option<T> {
  return {
    value: item.id,
    object: item,
  };
}
