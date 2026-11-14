import React, { useEffect, useRef, useState } from "react";
import { Button } from "react-bootstrap";
import { FormattedMessage, useIntl } from "react-intl";
import cx from "classnames";
import { RatingSystem } from "src/components/Shared/Rating/RatingSystem";
import { OCounterButton } from "src/components/Scenes/SceneDetails/OCounterButton";
import { OrganizedButton } from "src/components/Scenes/SceneDetails/OrganizedButton";
import {
  Performer,
  PerformerSelect,
} from "src/components/Performers/PerformerSelect";
import { Tag, TagSelect } from "src/components/Tags/TagSelect";

export interface IMediaPersonRef {
  id: string;
  name?: string | null;
  alias_list?: string[] | null;
  disambiguation?: string | null;
  image_path?: string | null;
  birthdate?: string | null;
  death_date?: string | null;
}

export interface IMediaTagRef {
  id: string;
  name: string;
}

interface IProps {
  rating100: number | null | undefined;
  onSetRating: (value: number | null) => void;
  organized: boolean;
  organizedLoading?: boolean;
  onToggleOrganized: () => void;
  oCounter: number;
  onIncrementO: () => Promise<void>;
  onDecrementO: () => Promise<void>;
  onResetO: () => Promise<void>;
  performers: IMediaPersonRef[];
  onPerformersChange: (ids: string[]) => void;
  tags: IMediaTagRef[];
  onTagsChange: (ids: string[]) => void;
  onCreateMarker?: (primaryTagId: string) => Promise<void>;
  onEditDetails?: () => void;
  onShowViewer?: () => void;
  showingViewer?: boolean;
  menu?: React.ReactNode;
  extra?: React.ReactNode;
  placement?: "fixed" | "absolute";
  onExpandedChange?: (expanded: boolean) => void;
}

function asPerformer(person: IMediaPersonRef): Performer {
  return {
    id: person.id,
    name: person.name ?? "",
    alias_list: person.alias_list ?? [],
    disambiguation: person.disambiguation ?? null,
    image_path: person.image_path ?? "",
    birthdate: person.birthdate ?? null,
    death_date: person.death_date ?? null,
  };
}

function asTag(tag: IMediaTagRef): Tag {
  return {
    id: tag.id,
    name: tag.name,
    sort_name: tag.name,
    aliases: [],
    image_path: "",
    stash_ids: [],
  };
}

const SWIPE_DISTANCE = 28;

export const MediaQuickEditSheet: React.FC<IProps> = ({
  rating100,
  onSetRating,
  organized,
  organizedLoading = false,
  onToggleOrganized,
  oCounter,
  onIncrementO,
  onDecrementO,
  onResetO,
  performers,
  onPerformersChange,
  tags,
  onTagsChange,
  onCreateMarker,
  onEditDetails,
  onShowViewer,
  showingViewer = false,
  menu,
  extra,
  placement = "fixed",
  onExpandedChange,
}) => {
  const intl = useIntl();
  const [expanded, setExpanded] = useState(false);
  const [performerValues, setPerformerValues] = useState<Performer[]>([]);
  const [tagValues, setTagValues] = useState<Tag[]>([]);
  const [markerTag, setMarkerTag] = useState<Tag | undefined>();
  const [markerSaving, setMarkerSaving] = useState(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  useEffect(() => {
    setPerformerValues(performers.map(asPerformer));
  }, [performers]);

  useEffect(() => {
    setTagValues(tags.map(asTag));
  }, [tags]);

  function setSheetExpanded(next: boolean) {
    setExpanded(next);
    onExpandedChange?.(next);
  }

  function toggleExpanded() {
    setSheetExpanded(!expanded);
  }

  function onPointerDown(event: React.PointerEvent) {
    event.stopPropagation();
    if (event.pointerType === "mouse" && event.button !== 0) return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerMove(event: React.PointerEvent) {
    const start = swipeStart.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dy) < 8 || Math.abs(dy) < Math.abs(dx)) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerUp(event: React.PointerEvent) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dy) < SWIPE_DISTANCE || Math.abs(dy) < Math.abs(dx)) return;

    const target = event.target as HTMLElement;
    if (target.closest(".media-quick-edit-body, .dropdown-menu")) return;

    if (dy < 0) setSheetExpanded(true);
    else setSheetExpanded(false);
    swiped.current = true;
  }

  function onClickCapture(event: React.MouseEvent) {
    if (!swiped.current) return;
    swiped.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  async function createMarker() {
    if (!onCreateMarker || !markerTag) return;
    setMarkerSaving(true);
    try {
      await onCreateMarker(markerTag.id);
      setMarkerTag(undefined);
    } finally {
      setMarkerSaving(false);
    }
  }

  return (
    <div
      className={cx("media-quick-edit", {
        "is-anchored": placement === "absolute",
        "is-expanded": expanded,
      })}
      onClick={(event) => event.stopPropagation()}
      onClickCapture={onClickCapture}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        swipeStart.current = null;
      }}
    >
      <button
        type="button"
        className="media-quick-edit-handle"
        aria-expanded={expanded}
        onClick={toggleExpanded}
      >
        <span className="media-quick-edit-grabber" />
      </button>
      <div className="media-quick-edit-bar">
        <div className="media-quick-edit-controls">
          <RatingSystem
            value={rating100}
            onSetRating={onSetRating}
            clickToRate
            withoutContext
          />
          <OCounterButton
            value={oCounter}
            onIncrement={onIncrementO}
            onDecrement={onDecrementO}
            onReset={onResetO}
          />
          <OrganizedButton
            loading={organizedLoading}
            organized={organized}
            onClick={onToggleOrganized}
          />
          {extra}
        </div>
        {menu ? (
          <div className="dropup media-quick-edit-menu">
            {React.isValidElement(menu)
              ? React.cloneElement(
                  menu as React.ReactElement<{
                    alignRight?: boolean;
                    drop?: string;
                  }>,
                  { alignRight: true, drop: "up" }
                )
              : menu}
          </div>
        ) : null}
      </div>
      {expanded ? (
        <div className="media-quick-edit-body">
          <div>
            <div className="media-quick-edit-label">
              <FormattedMessage id="performers" />
            </div>
            <PerformerSelect
              isMulti
              values={performerValues}
              onSelect={(items) => {
                setPerformerValues(items);
                onPerformersChange(items.map((item) => item.id));
              }}
            />
          </div>
          <div>
            <div className="media-quick-edit-label">
              <FormattedMessage id="tags" />
            </div>
            <TagSelect
              isMulti
              values={tagValues}
              onSelect={(items) => {
                setTagValues(items);
                onTagsChange(items.map((item) => item.id));
              }}
            />
          </div>
          {onCreateMarker ? (
            <div>
              <div className="media-quick-edit-label">
                <FormattedMessage id="primary_tag" />
              </div>
              <TagSelect
                values={markerTag ? [markerTag] : []}
                onSelect={(items) => setMarkerTag(items[0])}
              />
              <Button
                className="mt-2"
                size="sm"
                variant="secondary"
                disabled={!markerTag || markerSaving}
                onClick={() => void createMarker()}
              >
                <FormattedMessage id="actions.create_marker" />
              </Button>
            </div>
          ) : null}
          <div className="media-quick-edit-actions">
            {showingViewer && onEditDetails ? (
              <Button size="sm" variant="primary" onClick={onEditDetails}>
                <FormattedMessage id="actions.edit" />
              </Button>
            ) : null}
            {!showingViewer && onShowViewer ? (
              <Button
                size="sm"
                variant="primary"
                onClick={onShowViewer}
                title={intl.formatMessage({
                  id: "actions.view_media",
                  defaultMessage: "View",
                })}
              >
                {intl.formatMessage({
                  id: "actions.view_media",
                  defaultMessage: "View",
                })}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
};
