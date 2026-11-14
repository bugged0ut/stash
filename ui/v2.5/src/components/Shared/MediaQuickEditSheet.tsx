import React, { useEffect, useState } from "react";
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
import { Studio, StudioSelect } from "src/components/Studios/StudioSelect";

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

export interface IMediaStudioRef {
  id: string;
  name: string;
  aliases?: string[] | null;
  image_path?: string | null;
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
  studio: IMediaStudioRef | null;
  onStudioChange: (id: string | null) => void;
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

function asStudio(studio: IMediaStudioRef): Studio {
  return {
    id: studio.id,
    name: studio.name,
    aliases: studio.aliases ?? [],
    image_path: studio.image_path ?? "",
  };
}

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
  studio,
  onStudioChange,
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
  const [studioValue, setStudioValue] = useState<Studio | null>(null);
  const [markerTag, setMarkerTag] = useState<Tag | undefined>();
  const [markerSaving, setMarkerSaving] = useState(false);

  useEffect(() => {
    setPerformerValues(performers.map(asPerformer));
  }, [performers]);

  useEffect(() => {
    setTagValues(tags.map(asTag));
  }, [tags]);

  useEffect(() => {
    setStudioValue(studio ? asStudio(studio) : null);
  }, [studio]);

  function toggleExpanded() {
    setExpanded((current) => {
      const next = !current;
      onExpandedChange?.(next);
      return next;
    });
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
      onPointerDown={(event) => event.stopPropagation()}
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
        {menu ? (
          <div className="dropup media-quick-edit-menu">{menu}</div>
        ) : null}
        {extra}
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
          <div>
            <div className="media-quick-edit-label">
              <FormattedMessage id="studio" />
            </div>
            <StudioSelect
              values={studioValue ? [studioValue] : []}
              onSelect={(items) => {
                const next = items.length > 0 ? items[0] : null;
                setStudioValue(next);
                onStudioChange(next ? next.id : null);
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
