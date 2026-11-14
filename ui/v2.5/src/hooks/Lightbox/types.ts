import * as GQL from "src/core/generated-graphql";

interface IImagePaths {
  image?: GQL.Maybe<string>;
  thumbnail?: GQL.Maybe<string>;
  preview?: GQL.Maybe<string>;
}

interface IFiles {
  __typename?: string;
  path: string;
  width: number;
  height: number;
  video_codec?: GQL.Maybe<string>;
}

interface IWithPath {
  path: string;
}

export interface IGallery {
  id: string;
  title?: GQL.Maybe<string>;
  files?: GQL.Maybe<IWithPath[]>;
  folder?: GQL.Maybe<IWithPath>;
}

export interface ILightboxImage {
  id?: string;
  title?: GQL.Maybe<string>;
  rating100?: GQL.Maybe<number>;
  o_counter?: GQL.Maybe<number>;
  organized?: boolean | null;
  paths: IImagePaths;
  visual_files?: IFiles[];
  galleries?: GQL.Maybe<IGallery[]>;
  studio?: {
    id: string;
    name: string;
    aliases?: string[] | null;
    image_path?: string | null;
  } | null;
  tags?: { id: string; name: string }[] | null;
  performers?:
    | {
        id: string;
        name?: string | null;
        alias_list?: string[] | null;
        disambiguation?: string | null;
        image_path?: string | null;
        birthdate?: string | null;
        death_date?: string | null;
      }[]
    | null;
}

export interface IChapter {
  id: string;
  title: string;
  image_index: number;
}
