// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { prettyNumber, ZoomInfo, Dataset } from "../../core";
import { DataType, DataKind } from "../../core/specification";
import { convertColumn } from "../../core/dataset/data_types";

export function classNames(...args: Array<string | [string, boolean]>) {
  return args
    .filter(x => x != null && (typeof x == "string" || x[1] == true))
    .map(x => (typeof x == "string" ? x : x[0]))
    .join(" ");
}

export function toSVGNumber(x: number) {
  return prettyNumber(x, 8);
}

export function toSVGZoom(zoom: ZoomInfo) {
  return `translate(${prettyNumber(zoom.centerX)},${prettyNumber(
    zoom.centerY
  )}) scale(${prettyNumber(zoom.scale)})`;
}

export function parseHashString(value: string) {
  // Make sure value doesn't start with "#" or "#!"
  if (value[0] == "#") {
    value = value.substr(1);
  }
  if (value[0] == "!") {
    value = value.substr(1);
  }

  // Split by & and parse each key=value pair
  return value.split("&").reduce(
    (prev, str) => {
      const pair = str.split("=");
      prev[decodeURIComponent(pair[0])] =
        pair.length == 2 ? decodeURIComponent(pair[1]) : "";
      return prev;
    },
    {} as { [key: string]: string }
  );
}

export interface RenderDataURLToPNGOptions {
  mode: "scale" | "thumbnail";
  scale?: number;
  thumbnail?: [number, number];
  background?: string;
}

export function renderDataURLToPNG(
  dataurl: string,
  options: RenderDataURLToPNGOptions
): Promise<HTMLCanvasElement> {
  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    const img = new Image();
    img.src = dataurl;
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      switch (options.mode) {
        case "scale":
          {
            canvas.width = width * options.scale;
            canvas.height = height * options.scale;
            if (options.background) {
              ctx.fillStyle = options.background;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.scale(options.scale, options.scale);
            ctx.drawImage(img, 0, 0);
          }
          break;
        case "thumbnail":
          {
            canvas.width = options.thumbnail[0];
            canvas.height = options.thumbnail[1];
            if (options.background) {
              ctx.fillStyle = options.background;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            const maxScale = Math.max(
              canvas.width / width,
              canvas.height / height
            );
            ctx.scale(maxScale, maxScale);
            ctx.drawImage(img, 0, 0);
          }
          break;
      }
      resolve(canvas);
    };
    img.onerror = () => {
      reject(new Error("failed to load image"));
    };
  });
}

export function readFileAsString(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error(`unable to read file ${file.name}`));
    };
    reader.readAsText(file, "utf-8");
  });
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(new Error(`unable to read file ${file.name}`));
    };
    reader.readAsDataURL(file);
  });
}

export function getExtensionFromFileName(filename: string) {
  const m = filename.match(/\.([^\.]+)$/);
  if (m) {
    return m[1].toLowerCase();
  } else {
    return null;
  }
}

export function getFileNameWithoutExtension(filename: string) {
  return filename.replace(/\.([^\.]+)$/, "");
}

export function showOpenFileDialog(accept?: string[]): Promise<File> {
  return new Promise<File>((resolve, reject) => {
    const inputElement = document.createElement("input");
    inputElement.type = "file";
    if (accept != null) {
      inputElement.accept = accept.map(x => "." + x).join(",");
    }
    inputElement.onchange = e => {
      if (inputElement.files.length == 1) {
        resolve(inputElement.files[0]);
      } else {
        reject();
      }
    };
    inputElement.click();
  });
}

export function b64EncodeUnicode(str: string) {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    })
  );
}
export function stringToDataURL(mimeType: string, content: string) {
  return "data:" + mimeType + ";base64," + b64EncodeUnicode(content);
}

function checkConvertion(
  type: DataType,
  dataSample: Array<string | boolean | Date | number>
) {
  let convertable = true;
  if (type === DataType.String) {
    return convertable;
  }

  switch (type) {
    case DataType.Boolean:
      for (const data of dataSample) {
        if (
          data &&
          (data.toString().toLowerCase() != "0" &&
            data.toString().toLowerCase() != "true" &&
            data.toString().toLowerCase() != "1" &&
            data.toString().toLowerCase() != "false" &&
            data.toString().toLowerCase() != "yes" &&
            data.toString().toLowerCase() != "no")
        ) {
          convertable = false;
          break;
        }
      }
      return convertable;
    case DataType.Date:
      convertable = true;
      for (const data of dataSample) {
        if (
          data &&
          Number.isNaN(Date.parse(data.toString())) &&
          Number.isNaN(new Date(+data.toString()).getDate())
        ) {
          convertable = false;
          break;
        }
      }
      return convertable;
    case DataType.Number:
      convertable = true;
      for (const data of dataSample) {
        if (data && Number.isNaN(Number.parseFloat(data.toString()))) {
          convertable = false;
          break;
        }
      }
      return convertable;
    default:
      return false;
  }
}

export function getConvertableDataKind(
  type: DataType,
  dataSample?: Array<string | boolean | Date | number>
): DataKind[] {
  let types;
  switch (type) {
    case DataType.Boolean:
      types = [DataKind.Ordinal, DataKind.Categorical];
      break;
    case DataType.Date:
      types = [DataKind.Categorical, DataKind.Ordinal, DataKind.Temporal];
      break;
    case DataType.String:
      types = [DataKind.Categorical, DataKind.Ordinal];
      break;
    case DataType.Number:
      types = [DataKind.Categorical, DataKind.Numerical, DataKind.Ordinal];
      break;
  }

  return types;
}

export function getConvertableTypes(
  type: DataType,
  dataSample?: Array<string | boolean | Date | number>
): DataType[] {
  let types;
  switch (type) {
    case DataType.Boolean:
      types = [DataType.Number, DataType.String, DataType.Boolean];
      break;
    case DataType.Date:
      types = [DataType.Number, DataType.String, DataType.Date];
      break;
    case DataType.String:
      types = [
        DataType.Number,
        DataType.String,
        DataType.Boolean,
        DataType.Date
      ];
      break;
    case DataType.Number:
      types = [
        DataType.Number,
        DataType.String,
        DataType.Boolean,
        DataType.Date
      ];
      break;
  }

  return types.filter(t => {
    if (t == type) {
      return true;
    }
    if (dataSample) {
      return checkConvertion(t, dataSample.map(d => d && d.toString()));
    }
  });
}

/** Fill table with values converted to @param type from origin table */
export function convertColumns(
  table: Dataset.Table,
  column: Dataset.Column,
  originTable: Dataset.Table,
  type: Dataset.DataType
) {
  const applyConvertedValues = (
    table: Dataset.Table,
    columnName: string,
    convertedValues: Array<string | number | boolean>
  ) => {
    table.rows.forEach((value: any, index: number) => {
      value[columnName] = convertedValues[index];
    });
  };

  const originColumn = originTable.columns.find(
    col => col.name === column.name
  );
  let columnValues = originTable.rows.map(
    row => row[column.metadata.rawColumnName] || row[column.name]
  );
  const typeBeforeChange = column.type;
  column.type = type;

  columnValues = originTable.rows.map(row => {
    const value = row[column.metadata.rawColumnName] || row[column.name];
    return value && value.toString();
  });

  try {
    const convertedValues = convertColumn(type, columnValues as any);
    if (convertedValues.filter(val => val).length === 0) {
      throw Error(
        `Converting column type from ${originColumn.type} to ${type} failed`
      );
    }
    applyConvertedValues(table, column.name, convertedValues);
    return null;
  } catch (ex) {
    const messgae = `Converting column type from ${
      originColumn.type
    } to ${type} failed`;
    console.warn(messgae);
    // rollback type
    column.type = typeBeforeChange;
    return messgae;
  }
}
