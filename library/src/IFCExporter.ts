import {
  IFCBUILDING,
  IFCBUILDINGSTOREY,
  IFCRELAGGREGATES,
  IFCRELCONTAINEDINSPATIALSTRUCTURE,
  IFCSITE,
  IfcAPI
} from 'web-ifc';
import { Mesh, Vector3, Color, Material } from 'three';

import { ExportHelper, pt } from './ExportHelper';

export interface ExportObject {
  geometries: any[];
  geometryMaterials: Material[];
  ifcElementType: any;
  ifcElementId: number;
  placement: Vector3;
}

export class IFCExporter {
  private styleList: any = [];
  private uuidList: any = [];

  constructor(public api = new IfcAPI()) {}

  async exportMeshAsIFCProduct(
    exporter: ExportHelper,
    mesh: any[],
    ifcElement: any,
    ifcId: any,
    objectPlacement: Vector3
  ): Promise<any> {
    const brepShapeList: any = [];
    for (let k = 0; k < mesh.length; k++) {
      const geom = mesh[k].geometry;
      // @ts-ignore
      const index = geom.getIndex().array;
      // @ts-ignore
      const position = geom.attributes.position.array;

      const posStride = geom.attributes.position.itemSize;

      const faces = [];
      for (let i = 0; i < index.length; i += 3) {
        const ia = index[i + 0];
        const ib = index[i + 1];
        const ic = index[i + 2];

        const pta: pt = {
          x: position[ia * posStride + 0],
          y: position[ia * posStride + 1],
          z: position[ia * posStride + 2]
        };
        const ptb: pt = {
          x: position[ib * posStride + 0],
          y: position[ib * posStride + 1],
          z: position[ib * posStride + 2]
        };
        const ptc: pt = {
          x: position[ic * posStride + 0],
          y: position[ic * posStride + 1],
          z: position[ic * posStride + 2]
        };
        // @ts-ignore
        faces.push(await exporter.Face([pta, ptb, ptc]));
      }

      const brep = await exporter.FacetedBREP(faces);
      const brepShape = await exporter.ShapeBREP([brep]);

      // Create material assignment for this geometry
      if (mesh[k].material) {
        const uuid = mesh[k].material.uuid;
        let preexistantMaterial = -1;
        for (let i = 0; i < this.uuidList.length; i++) {
          if (this.uuidList[i] === uuid) {
            preexistantMaterial = i;
          }
        }

        if (preexistantMaterial === -1) {
          // @ts-ignore
          const col = mesh[k].material.color as Color;
          // @ts-ignore
          const opacity = mesh[k].material.opacity as number;

          if (col) {
            const style = await exporter.ShapePresentationStyleAssignment(
              'material',
              col.r,
              col.g,
              col.b,
              1 - opacity
            );
            this.uuidList.push(uuid);
            this.styleList.push(style);
            await exporter.StyledItem(brep, style);
          }
        } else {
          await exporter.StyledItem(brep, this.styleList[preexistantMaterial]);
        }
      }

      brepShapeList.push(brepShape);
    }

    const productDef = await exporter.ProductDefinitionShape(brepShapeList);
    const placement = await exporter.Placement({
      x: objectPlacement.x,
      y: objectPlacement.y,
      z: objectPlacement.z
    });
    const element = await exporter.Product(ifcElement, ifcId, productDef, placement);

    return element;
  }

  async createModelForExport(projectPlacement: Vector3, north: Vector3, objects: ExportObject[]) {
    if (this.api.wasmModule === undefined) await this.api.Init();
    console.log('Exporting model...');

    const model = this.api.CreateModel();
    const exporter = new ExportHelper(model, this.api);
    const context = await exporter.RepresentationContext(projectPlacement, north);
    await exporter.RepresentationSubContext(context, 'Axis', 'Model', 'GRAPH_VIEW');
    await exporter.RepresentationSubContext(context, 'Body', 'Model', 'MODEL_VIEW');
    await exporter.RepresentationSubContext(context, 'Box', 'Model', 'MODEL_VIEW');
    await exporter.RepresentationSubContext(context, 'Footprint', 'Model', 'MODEL_VIEW');
    const project = await exporter.Project(
      context,
      'web-ifc-three',
      'this project was exported from web-ifc-three'
    );

    const elementsList: any = [];
    for (let i = 0; i < objects.length; i++) {
      const meshList: any = [];
      for (let j = 0; j < objects[i].geometries.length; j++) {
        const mesh = new Mesh(objects[i].geometries[j], objects[i].geometryMaterials[j]);
        meshList.push(mesh);
      }
      const ifcElement = await this.exportMeshAsIFCProduct(
        exporter,
        meshList,
        objects[i].ifcElementType,
        objects[i].ifcElementId,
        objects[i].placement
      );
      elementsList.push(ifcElement);
    }

    const placement = await exporter.Placement({
      x: projectPlacement.x,
      y: projectPlacement.y,
      z: projectPlacement.z
    });
    const buildingStorey = await exporter.BuildingStorey(IFCBUILDINGSTOREY, placement);
    const building = await exporter.Building(IFCBUILDING, placement);
    const site = await exporter.Site(IFCSITE, placement);
    const StoreyList: any = [];
    const BuildingList: any = [];
    const SiteList: any = [];
    StoreyList.push(buildingStorey);
    BuildingList.push(building);
    SiteList.push(site);
    await exporter.RelContainedInSpatialStructure(
      IFCRELCONTAINEDINSPATIALSTRUCTURE,
      buildingStorey,
      elementsList
    );
    await exporter.RelAggregates(IFCRELAGGREGATES, building, StoreyList);
    await exporter.RelAggregates(IFCRELAGGREGATES, site, BuildingList);
    await exporter.RelAggregates(IFCRELAGGREGATES, project, SiteList);

    const ifcData = await this.api.ExportFileAsIFC(model);
    const ifcDataString = new TextDecoder().decode(ifcData);
    console.log(ifcDataString);

    const element = document.createElement('a');
    element.setAttribute(
      'href',
      `data:text/plain;charset=utf-8,${encodeURIComponent(ifcDataString)}`
    );
    element.setAttribute('download', 'export.ifc');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }
}
