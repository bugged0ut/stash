import React from "react";
import * as GQL from "src/core/generated-graphql";
import { ImageCard } from "./ImageCard";
import {
  useCardWidth,
  useContainerDimensions,
} from "../Shared/GridCard/GridCard";
import { PatchComponent } from "src/patch";
import { ImageQueue } from "src/models/imageQueue";

interface IImageCardGrid {
  images: GQL.SlimImageDataFragment[];
  selectedIds: Set<string>;
  zoomIndex: number;
  onSelectChange: (id: string, selected: boolean, shiftKey: boolean) => void;
  onPreview: (index: number, ev: React.MouseEvent<Element, MouseEvent>) => void;
  queue?: ImageQueue;
}

const zoomWidths = [280, 340, 480, 640];

export const ImageCardGrid: React.FC<IImageCardGrid> = PatchComponent(
  "ImageCardGrid",
  ({ images, selectedIds, zoomIndex, onSelectChange, onPreview, queue }) => {
    const [componentRef, { width: containerWidth }] = useContainerDimensions();
    const cardWidth = useCardWidth(containerWidth, zoomIndex, zoomWidths);

    const queueParams = React.useMemo(() => {
      const ids = images.map((img) => img.id);
      if (queue) return queue.makeQueryParameters(undefined, ids);
      return ids.map((id) => `qs=${id}`).join("&");
    }, [images, queue]);

    return (
      <div className="row justify-content-center" ref={componentRef}>
        {images.map((image, index) => (
          <ImageCard
            key={image.id}
            cardWidth={cardWidth}
            image={image}
            zoomIndex={zoomIndex}
            selecting={selectedIds.size > 0}
            selected={selectedIds.has(image.id)}
            queueParams={queueParams}
            onSelectedChanged={(selected: boolean, shiftKey: boolean) =>
              onSelectChange(image.id, selected, shiftKey)
            }
            onPreview={
              selectedIds.size < 1 ? (ev) => onPreview(index, ev) : undefined
            }
          />
        ))}
      </div>
    );
  }
);
