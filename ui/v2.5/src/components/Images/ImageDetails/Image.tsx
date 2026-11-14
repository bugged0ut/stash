import { Tab, Nav, Dropdown, Button } from "react-bootstrap";
import React, { useEffect, useMemo, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useHistory, useLocation, RouteComponentProps } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  useFindImage,
  useImageIncrementO,
  useImageUpdate,
  mutateMetadataScan,
  useImageDecrementO,
  useImageResetO,
} from "src/core/StashService";
import { ErrorMessage } from "src/components/Shared/ErrorMessage";
import { LoadingIndicator } from "src/components/Shared/LoadingIndicator";
import { Icon } from "src/components/Shared/Icon";
import { Counter } from "src/components/Shared/Counter";
import { useToast } from "src/hooks/Toast";
import * as Mousetrap from "mousetrap";
import * as GQL from "src/core/generated-graphql";
import { OCounterButton } from "src/components/Scenes/SceneDetails/OCounterButton";
import { OrganizedButton } from "src/components/Scenes/SceneDetails/OrganizedButton";
import { ImageFileInfoPanel } from "./ImageFileInfoPanel";
import { ImageEditPanel } from "./ImageEditPanel";
import { ImageDetailPanel } from "./ImageDetailPanel";
import { DeleteImagesDialog } from "../DeleteImagesDialog";
import {
  faEllipsisV,
  faChevronLeft,
  faChevronRight,
  faExpand,
} from "@fortawesome/free-solid-svg-icons";
import { imagePath, imageTitle } from "src/core/files";
import { isVideo } from "src/utils/visualFile";
import { useScrollToTopOnMount } from "src/hooks/scrollToTop";
import { useRatingKeybinds } from "src/hooks/keybinds";
import { useConfigurationContext } from "src/hooks/Config";
import TextUtils from "src/utils/text";
import { RatingSystem } from "src/components/Shared/Rating/RatingSystem";
import cx from "classnames";
import { TruncatedText } from "src/components/Shared/TruncatedText";
import { goBackOrReplace } from "src/utils/history";
import { FormattedDate } from "src/components/Shared/Date";
import { GenerateDialog } from "src/components/Dialogs/GenerateDialog";
import { StudioLogo } from "src/components/Shared/StudioLogo";
import { useLightbox } from "src/hooks/Lightbox/hooks";
import { useMediaQuery } from "src/utils/screen";
import { MediaQuickEditSheet } from "src/components/Shared/MediaQuickEditSheet";

interface IProps {
  image: GQL.ImageDataFragment;
}

interface IImageParams {
  id: string;
}

const ImagePage: React.FC<IProps> = ({ image }) => {
  const history = useHistory();
  const location = useLocation();
  const Toast = useToast();
  const intl = useIntl();
  const { configuration } = useConfigurationContext();
  const { showStudioText } = configuration?.ui ?? {};

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const imageIDs = useMemo(() => queryParams.getAll("qs"), [queryParams]);
  const currentIndex = useMemo(
    () => imageIDs.indexOf(image.id),
    [imageIDs, image.id]
  );
  const prevImageID = useMemo(
    () => (currentIndex > 0 ? imageIDs[currentIndex - 1] : null),
    [imageIDs, currentIndex]
  );
  const nextImageID = useMemo(
    () =>
      currentIndex !== -1 && currentIndex < imageIDs.length - 1
        ? imageIDs[currentIndex + 1]
        : null,
    [imageIDs, currentIndex]
  );

  const navigateToImage = (targetID: string) => {
    history.replace(`/images/${targetID}${location.search}`);
  };

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const swiped = React.useRef(false);
  const narrow = useMediaQuery("(max-width: 1199px)");
  const lightboxImages = React.useMemo(() => [image], [image]);
  const showLightbox = useLightbox({
    images: lightboxImages,
    showNavigation: false,
  });

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe && nextImageID) {
      swiped.current = true;
      navigateToImage(nextImageID);
    } else if (isRightSwipe && prevImageID) {
      swiped.current = true;
      navigateToImage(prevImageID);
    }
  };

  function openLightbox() {
    showLightbox({ initialIndex: 0 });
  }

  function onImageClick(event: React.MouseEvent) {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest(".image-nav-button, .image-open-viewer, video")) return;
    openLightbox();
  }

  const [incrementO] = useImageIncrementO(image.id);
  const [decrementO] = useImageDecrementO(image.id);
  const [resetO] = useImageResetO(image.id);

  const [updateImage] = useImageUpdate();

  async function saveQuiet(patch: Omit<GQL.ImageUpdateInput, "id">) {
    try {
      await updateImage({
        variables: {
          input: {
            id: image.id,
            ...patch,
          },
        },
      });
    } catch (e) {
      Toast.error(e);
    }
  }

  const [organizedLoading, setOrganizedLoading] = useState(false);

  const [activeTabKey, setActiveTabKey] = useState("image-edit-panel");

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState<boolean>(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

  async function onSave(input: GQL.ImageUpdateInput) {
    await updateImage({
      variables: { input },
    });
    Toast.success(
      intl.formatMessage(
        { id: "toast.updated_entity" },
        { entity: intl.formatMessage({ id: "image" }).toLocaleLowerCase() }
      )
    );
  }

  async function onRescan() {
    if (!image || !image.visual_files.length) {
      return;
    }

    await mutateMetadataScan({
      paths: [imagePath(image)],
      rescan: true,
    });

    Toast.success(
      intl.formatMessage(
        { id: "toast.rescanning_entity" },
        {
          count: 1,
          singularEntity: intl.formatMessage({ id: "image" }),
        }
      )
    );
  }

  const onOrganizedClick = async () => {
    try {
      setOrganizedLoading(true);
      await updateImage({
        variables: {
          input: {
            id: image.id,
            organized: !image.organized,
          },
        },
      });
    } catch (e) {
      Toast.error(e);
    } finally {
      setOrganizedLoading(false);
    }
  };

  const onIncrementClick = async () => {
    try {
      await incrementO();
    } catch (e) {
      Toast.error(e);
    }
  };

  const onDecrementClick = async () => {
    try {
      await decrementO();
    } catch (e) {
      Toast.error(e);
    }
  };

  const onResetClick = async () => {
    try {
      await resetO();
    } catch (e) {
      Toast.error(e);
    }
  };

  function setRating(v: number | null) {
    updateImage({
      variables: {
        input: {
          id: image.id,
          rating100: v,
        },
      },
    });
  }

  useRatingKeybinds(
    true,
    configuration?.ui.ratingSystemOptions?.type,
    setRating
  );

  function onDeleteDialogClosed(deleted: boolean) {
    setIsDeleteAlertOpen(false);
    if (deleted) {
      goBackOrReplace(history, "/images");
    }
  }

  function maybeRenderDeleteDialog() {
    if (isDeleteAlertOpen && image) {
      return (
        <DeleteImagesDialog selected={[image]} onClose={onDeleteDialogClosed} />
      );
    }
  }

  function maybeRenderSceneGenerateDialog() {
    if (isGenerateDialogOpen) {
      return (
        <GenerateDialog
          selectedIds={[image.id]}
          onClose={() => {
            setIsGenerateDialogOpen(false);
          }}
          type="image"
        />
      );
    }
  }

  function renderOperations() {
    return (
      <Dropdown>
        <Dropdown.Toggle
          variant="secondary"
          id="operation-menu"
          className="minimal"
          title="Operations"
        >
          <Icon icon={faEllipsisV} />
        </Dropdown.Toggle>
        <Dropdown.Menu className="bg-secondary text-white">
          <Dropdown.Item
            key="rescan"
            className="bg-secondary text-white"
            onClick={() => onRescan()}
          >
            <FormattedMessage id="actions.rescan" />
          </Dropdown.Item>
          <Dropdown.Item
            key="generate"
            className="bg-secondary text-white"
            onClick={() => setIsGenerateDialogOpen(true)}
          >
            <FormattedMessage id="actions.generate" />…
          </Dropdown.Item>
          <Dropdown.Item
            key="delete-image"
            className="bg-secondary text-white"
            onClick={() => setIsDeleteAlertOpen(true)}
          >
            <FormattedMessage
              id="actions.delete"
              values={{ entityType: intl.formatMessage({ id: "image" }) }}
            />
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  function renderTabs() {
    if (!image) {
      return;
    }

    return (
      <Tab.Container
        activeKey={activeTabKey}
        onSelect={(k) => k && setActiveTabKey(k)}
      >
        <div>
          <Nav variant="tabs" className="mr-auto">
            <Nav.Item>
              <Nav.Link eventKey="image-details-panel">
                <FormattedMessage id="details" />
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="image-file-info-panel">
                <FormattedMessage id="file_info" />
                <Counter count={image.visual_files.length} hideZero hideOne />
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="image-edit-panel">
                <FormattedMessage id="actions.edit" />
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </div>

        <Tab.Content>
          <Tab.Pane eventKey="image-details-panel">
            <ImageDetailPanel image={image} />
          </Tab.Pane>
          <Tab.Pane
            className="file-info-panel"
            eventKey="image-file-info-panel"
          >
            <ImageFileInfoPanel image={image} />
          </Tab.Pane>
          <Tab.Pane eventKey="image-edit-panel" mountOnEnter>
            <ImageEditPanel
              isVisible={activeTabKey === "image-edit-panel"}
              image={image}
              onSubmit={onSave}
              onDelete={() => setIsDeleteAlertOpen(true)}
            />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    );
  }

  // set up hotkeys
  useEffect(() => {
    Mousetrap.bind("a", () => setActiveTabKey("image-details-panel"));
    Mousetrap.bind("e", () => setActiveTabKey("image-edit-panel"));
    Mousetrap.bind("f", () => setActiveTabKey("image-file-info-panel"));
    Mousetrap.bind("o", () => {
      onIncrementClick();
    });
    if (prevImageID) {
      Mousetrap.bind("left", () => navigateToImage(prevImageID));
    }
    if (nextImageID) {
      Mousetrap.bind("right", () => navigateToImage(nextImageID));
    }

    return () => {
      Mousetrap.unbind("a");
      Mousetrap.unbind("e");
      Mousetrap.unbind("f");
      Mousetrap.unbind("o");
      Mousetrap.unbind("left");
      Mousetrap.unbind("right");
    };
  });

  const file = useMemo(
    () => (image.visual_files.length > 0 ? image.visual_files[0] : undefined),
    [image]
  );

  const title = imageTitle(image);
  const ImageView =
    image.visual_files.length > 0 && isVideo(image.visual_files[0])
      ? "video"
      : "img";

  const resolution = useMemo(() => {
    return file?.width && file?.height
      ? TextUtils.resolution(file?.width, file?.height)
      : undefined;
  }, [file?.width, file?.height]);

  return (
    <div className="row">
      <Helmet>
        <title>{title}</title>
      </Helmet>

      {maybeRenderDeleteDialog()}
      {maybeRenderSceneGenerateDialog()}
      <div className="image-tabs order-xl-first order-last">
        <div>
          <div className="image-header-container">
            <StudioLogo studio={image.studio} showText={showStudioText} />
            <h3 className={cx("image-header", { "no-studio": !image.studio })}>
              <TruncatedText lineCount={2} text={title} />
            </h3>
          </div>

          <div className="image-subheader">
            <span className="date" data-value={image.date}>
              {!!image.date && <FormattedDate value={image.date} />}
            </span>
            {resolution ? (
              <span className="resolution" data-value={resolution}>
                {resolution}
              </span>
            ) : undefined}
          </div>
        </div>

        <div className="image-toolbar">
          <span className="image-toolbar-group d-none d-xl-flex">
            <RatingSystem
              value={image.rating100}
              onSetRating={setRating}
              clickToRate
              withoutContext
            />
          </span>
          <span className="image-toolbar-group">
            <span className="d-none d-xl-inline">
              <OCounterButton
                value={image.o_counter || 0}
                onIncrement={onIncrementClick}
                onDecrement={onDecrementClick}
                onReset={onResetClick}
              />
            </span>
            <span className="d-none d-xl-inline">
              <OrganizedButton
                loading={organizedLoading}
                organized={image.organized}
                onClick={onOrganizedClick}
              />
            </span>
            <span className="d-none d-xl-inline">{renderOperations()}</span>
          </span>
        </div>
        {renderTabs()}
      </div>
      <div
        className="image-container"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={onImageClick}
      >
        {image.visual_files.length > 0 && (
          <ImageView
            loop={image.visual_files[0].__typename == "VideoFile"}
            autoPlay={image.visual_files[0].__typename == "VideoFile"}
            playsInline={image.visual_files[0].__typename == "VideoFile"}
            controls={image.visual_files[0].__typename == "VideoFile"}
            className="m-sm-auto no-gutter image-image"
            alt={title}
            src={image.paths.image ?? ""}
          />
        )}
        <Button
          className="image-open-viewer minimal"
          onClick={openLightbox}
          title={intl.formatMessage({
            id: "actions.view_media",
            defaultMessage: "View",
          })}
        >
          <Icon icon={faExpand} />
        </Button>
        {narrow ? (
          <MediaQuickEditSheet
            rating100={image.rating100}
            onSetRating={setRating}
            organized={image.organized}
            organizedLoading={organizedLoading}
            onToggleOrganized={() => {
              void onOrganizedClick();
            }}
            oCounter={image.o_counter ?? 0}
            onIncrementO={onIncrementClick}
            onDecrementO={onDecrementClick}
            onResetO={onResetClick}
            performers={image.performers ?? []}
            onPerformersChange={(ids) => {
              void saveQuiet({ performer_ids: ids });
            }}
            tags={image.tags ?? []}
            onTagsChange={(ids) => {
              void saveQuiet({ tag_ids: ids });
            }}
            studio={image.studio ?? null}
            onStudioChange={(studioId) => {
              void saveQuiet({ studio_id: studioId });
            }}
            onEditDetails={() => {
              setActiveTabKey("image-edit-panel");
              window.setTimeout(() => {
                document.getElementById("image-edit-details")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }, 50);
            }}
            showingViewer
            menu={renderOperations()}
          />
        ) : null}
        {prevImageID && (
          <Button
            className="image-nav-button prev minimal"
            onClick={() => navigateToImage(prevImageID)}
          >
            <Icon icon={faChevronLeft} />
          </Button>
        )}
        {nextImageID && (
          <Button
            className="image-nav-button next minimal"
            onClick={() => navigateToImage(nextImageID)}
          >
            <Icon icon={faChevronRight} />
          </Button>
        )}
      </div>
    </div>
  );
};

const ImageLoader: React.FC<RouteComponentProps<IImageParams>> = ({
  match,
}) => {
  const { id } = match.params;
  const { data, loading, error } = useFindImage(id);

  useScrollToTopOnMount();

  if (loading) return <LoadingIndicator />;
  if (error) return <ErrorMessage error={error.message} />;
  if (!data?.findImage)
    return <ErrorMessage error={`No image found with id ${id}.`} />;

  return <ImagePage image={data.findImage} />;
};

export default ImageLoader;
