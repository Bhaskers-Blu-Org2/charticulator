// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { CurrentChartView } from ".";
import { deepClone, Specification, Prototypes } from "../../../core";
import { findObjectById } from "../../../core/prototypes";
import { Actions } from "../../actions";
import { ButtonRaised, ErrorBoundary, SVGImageIcon } from "../../components";
import { ContextedComponent } from "../../context_component";
import * as R from "../../resources";
import { ExportTemplateTarget } from "../../template";
import { classNames } from "../../utils";
import { InputImageProperty, Button } from "../panels/widgets/controls";

export class InputGroup extends React.Component<
  {
    value: string;
    label: string;
    onChange: (newValue: string) => void;
  },
  {}
> {
  private ref: HTMLInputElement;

  public render() {
    return (
      <div className="form-group">
        <input
          ref={e => (this.ref = e)}
          type="text"
          required={true}
          value={this.props.value || ""}
          onChange={e => {
            this.props.onChange(this.ref.value);
          }}
        />
        <label>{this.props.label}</label>
        <i className="bar" />
      </div>
    );
  }
}

export class ExportImageView extends ContextedComponent<{}, { dpi: string }> {
  public state = { dpi: "144" };
  public getScaler() {
    let dpi = +this.state.dpi;
    if (dpi < 1 || dpi != dpi) {
      dpi = 144;
    }
    dpi = Math.max(Math.min(dpi, 1200), 36);
    return dpi / 72;
  }
  public render() {
    return (
      <div className="el-horizontal-layout-item is-fix-width">
        <CurrentChartView store={this.store} />
        <InputGroup
          label="DPI (for PNG/JPEG)"
          value={this.state.dpi}
          onChange={newValue => {
            this.setState({
              dpi: newValue
            });
          }}
        />
        <div className="buttons">
          <ButtonRaised
            text="PNG"
            url={R.getSVGIcon("toolbar/export")}
            onClick={() => {
              this.dispatch(
                new Actions.Export("png", { scale: this.getScaler() })
              );
            }}
          />{" "}
          <ButtonRaised
            text="JPEG"
            url={R.getSVGIcon("toolbar/export")}
            onClick={() => {
              this.dispatch(
                new Actions.Export("jpeg", { scale: this.getScaler() })
              );
            }}
          />{" "}
          <ButtonRaised
            text="SVG"
            url={R.getSVGIcon("toolbar/export")}
            onClick={() => {
              this.dispatch(new Actions.Export("svg"));
            }}
          />
        </div>
      </div>
    );
  }
}

export class ExportHTMLView extends ContextedComponent<{}, {}> {
  public render() {
    return (
      <div className="el-horizontal-layout-item is-fix-width">
        <CurrentChartView store={this.store} />
        <div className="buttons">
          <ButtonRaised
            text="HTML"
            url={R.getSVGIcon("toolbar/export")}
            onClick={() => {
              this.dispatch(new Actions.Export("html"));
            }}
          />
        </div>
      </div>
    );
  }
}

export interface FileViewExportState {
  exportMode: string;
}

export class FileViewExport extends ContextedComponent<
  {
    onClose: () => void;
  },
  FileViewExportState
> {
  public state: FileViewExportState = {
    exportMode: "image"
  };

  public renderExportView(mode: "image" | "html") {
    if (mode == "image") {
      return <ExportImageView />;
    }
    if (mode == "html") {
      return <ExportHTMLView />;
    }
  }

  public renderExportTemplate() {
    return (
      <div className="el-horizontal-layout-item is-fix-width">
        <CurrentChartView store={this.store} />
        <ExportTemplateView exportKind={this.state.exportMode} />
      </div>
    );
  }
  public render() {
    return (
      <div className="charticulator__file-view-content">
        <h1>Export</h1>
        <div className="el-horizontal-layout">
          <div className="el-horizontal-layout-item">
            <div className="charticulator__list-view">
              <div
                className={classNames("el-item", [
                  "is-active",
                  this.state.exportMode == "image"
                ])}
                onClick={() => this.setState({ exportMode: "image" })}
              >
                <SVGImageIcon url={R.getSVGIcon("toolbar/export")} />
                <span className="el-text">Export as Image</span>
              </div>
              <div
                className={classNames("el-item", [
                  "is-active",
                  this.state.exportMode == "html"
                ])}
                onClick={() => this.setState({ exportMode: "html" })}
              >
                <SVGImageIcon url={R.getSVGIcon("toolbar/export")} />
                <span className="el-text">Export as HTML</span>
              </div>
              {this.store.listExportTemplateTargets().map(name => (
                <div
                  key={name}
                  className={classNames("el-item", [
                    "is-active",
                    this.state.exportMode == name
                  ])}
                  onClick={() => this.setState({ exportMode: name })}
                >
                  <SVGImageIcon url={R.getSVGIcon("toolbar/export")} />
                  <span className="el-text">{name}</span>
                </div>
              ))}
            </div>
          </div>
          <ErrorBoundary maxWidth={300}>
            {this.state.exportMode == "image" || this.state.exportMode == "html"
              ? this.renderExportView(this.state.exportMode)
              : this.renderExportTemplate()}
          </ErrorBoundary>
        </div>
      </div>
    );
  }
}

export interface ExportTemplateViewState {
  template: Specification.Template.ChartTemplate;
  target: ExportTemplateTarget;
  targetProperties: { [name: string]: string };
}

export class ExportTemplateView extends ContextedComponent<
  { exportKind: string },
  {}
> {
  public state = this.getDefaultState(this.props.exportKind);

  public getDefaultState(kind: string): ExportTemplateViewState {
    const template = deepClone(this.store.buildChartTemplate());
    const target = this.store.createExportTemplateTarget(kind, template);
    const targetProperties: { [name: string]: string } = {};
    for (const property of target.getProperties()) {
      targetProperties[property.name] =
        this.store.getPropertyExportName(property.name) || property.default;
    }
    return {
      template,
      target,
      targetProperties
    };
  }

  public componentWillReceiveProps(newProps: { exportKind: string }) {
    this.setState(this.getDefaultState(newProps.exportKind));
  }

  public renderInput(
    label: string,
    type: string,
    value: any,
    defaultValue: any,
    onChange: (value: any) => void
  ) {
    let ref: HTMLInputElement;
    switch (type) {
      case "string":
        return (
          <div className="form-group">
            <input
              ref={e => (ref = e)}
              type="text"
              required={true}
              value={value || ""}
              onChange={e => {
                onChange(ref.value);
              }}
            />
            <label>{label}</label>
            <i className="bar" />
          </div>
        );

      case "boolean":
        const currentValue = value ? true : false;
        return (
          <div
            className="el-inference-item"
            onClick={() => {
              onChange(!currentValue);
            }}
          >
            <SVGImageIcon
              url={
                currentValue
                  ? R.getSVGIcon("checkbox/checked")
                  : R.getSVGIcon("checkbox/empty")
              }
            />
            <span className="el-text">{label}</span>
          </div>
        );
      case "file":
        return (
          <div className="form-group-file">
            <label>{label}</label>
            <div
              style={{
                display: "flex",
                flexDirection: "row"
              }}
            >
              <InputImageProperty
                value={value as Specification.Types.Image}
                onChange={(image: any) => {
                  onChange(image);
                  return true;
                }}
              />
              <Button
                icon={"general/eraser"}
                onClick={() => {
                  onChange(defaultValue);
                }}
              />
            </div>
            <i className="bar" />
          </div>
        );
    }
  }

  public renderTargetProperties() {
    return this.state.target.getProperties().map(property => {
      const displayName = this.store.getPropertyExportName(property.name);
      const targetProperties = this.state.targetProperties;

      return (
        <div key={property.name}>
          {this.renderInput(
            property.displayName,
            property.type,
            displayName || targetProperties[property.name],
            property.default,
            value => {
              this.store.setPropertyExportName(property.name, value);
              this.setState({
                targetProperties: {
                  ...targetProperties,
                  [property.name]: value
                }
              });
            }
          )}
        </div>
      );
    });
  }

  public renderSlots() {
    if (this.state.template.tables.length == 0) {
      return <p>(none)</p>;
    }
    return this.state.template.tables.map(table => (
      <div key={table.name}>
        {table.columns.map(column => (
          <div key={column.name}>
            {this.renderInput(
              column.name,
              "string",
              column.displayName,
              null,
              value => {
                column.displayName = value;
                this.setState({
                  template: this.state.template
                });
              }
            )}
          </div>
        ))}
      </div>
    ));
  }

  public renderInferences() {
    const template = this.state.template;
    if (template.inference.length == 0) {
      return <p>(none)</p>;
    }
    return (
      template.inference
        // Only show axis and scale inferences
        .filter(inference => inference.axis || inference.scale)
        .map((inference, index) => {
          let descriptionMin = inference.description;
          let descriptionMax = inference.description;
          if (!descriptionMin) {
            if (inference.scale) {
              const scaleName = findObjectById(
                template.specification,
                inference.objectID
              ).properties.name;
              descriptionMin = `Auto min domain and range for ${scaleName}`;
              descriptionMax = `Auto max domain and range for ${scaleName}`;
            }
            if (inference.axis) {
              const objectName = findObjectById(
                template.specification,
                inference.objectID
              ).properties.name;
              descriptionMin = `Auto axis min range for ${objectName}/${inference.axis.property.toString()}`;
              descriptionMax = `Auto axis max range for ${objectName}/${inference.axis.property.toString()}`;
            }
          }
          if (inference.disableAuto === undefined) {
            inference.disableAuto = false;
          }
          return (
            <React.Fragment key={index}>
              <div
                className="el-inference-item"
                onClick={() => {
                  inference.disableAutoMin = !inference.disableAutoMin;
                  this.setState({ template });
                }}
              >
                <SVGImageIcon
                  url={
                    inference.disableAutoMin
                      ? R.getSVGIcon("checkbox/empty")
                      : R.getSVGIcon("checkbox/checked")
                  }
                />
                <span className="el-text">{descriptionMin}</span>
              </div>
              <div
                className="el-inference-item"
                onClick={() => {
                  inference.disableAutoMax = !inference.disableAutoMax;
                  this.setState({ template });
                }}
              >
                <SVGImageIcon
                  url={
                    inference.disableAutoMax
                      ? R.getSVGIcon("checkbox/empty")
                      : R.getSVGIcon("checkbox/checked")
                  }
                />
                <span className="el-text">{descriptionMax}</span>
              </div>
            </React.Fragment>
          );
        })
    );
  }

  public renderExposedProperties() {
    const template = this.state.template;
    const result: JSX.Element[] = [];
    const templateObjects = new Map<string, Specification.ExposableObject>();
    for (const p of this.state.template.properties) {
      const id = p.objectID;
      const object = findObjectById(
        this.state.template.specification,
        id
      ) as Specification.ExposableObject;

      if (object && (p.target.attribute || p.target.property)) {
        if (object.exposed == undefined) {
          object.exposed = true;
        }
        templateObjects.set(id, object as Specification.ExposableObject);
      }
    }
    for (const [key, object] of templateObjects) {
      if (Prototypes.isType(object.classID, "guide")) {
        continue;
      }

      result.push(
        <div
          key={key}
          className="el-inference-item"
          onClick={() => {
            object.exposed = !object.exposed;
            this.setState({ template });
          }}
        >
          <SVGImageIcon
            url={
              !object.exposed
                ? R.getSVGIcon("checkbox/empty")
                : R.getSVGIcon("checkbox/checked")
            }
          />
          <SVGImageIcon
            url={R.getSVGIcon(
              Prototypes.ObjectClasses.GetMetadata(object.classID).iconPath
            )}
          />
          <span className="el-text">{object.properties.name}</span>
        </div>
      );
    }

    return result;
  }

  public render() {
    return (
      <div className="charticulator__export-template-view">
        <h2>Data Mapping Slots</h2>
        {this.renderSlots()}
        <h2>Axes and Scales</h2>
        {this.renderInferences()}
        <h2>Exposed Objects</h2>
        {this.renderExposedProperties()}
        <h2>{this.props.exportKind} Properties</h2>
        {this.renderTargetProperties()}
        <div className="buttons">
          <ButtonRaised
            text={this.props.exportKind}
            url={R.getSVGIcon("toolbar/export")}
            onClick={() => {
              this.dispatch(
                new Actions.ExportTemplate(
                  this.props.exportKind,
                  this.state.target,
                  this.state.targetProperties
                )
              );
            }}
          />
        </div>
      </div>
    );
  }
}
