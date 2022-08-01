import { IfcAPI } from 'web-ifc';
import { Vector3, Material } from 'three';
import { ExportHelper } from './ExportHelper';
export interface ExportObject {
    geometries: any[];
    geometryMaterials: Material[];
    ifcElementType: any;
    ifcElementId: number;
    placement: Vector3;
}
export declare class IFCExporter {
    api: IfcAPI;
    private styleList;
    private uuidList;
    constructor(api?: IfcAPI);
    exportMeshAsIFCProduct(exporter: ExportHelper, mesh: any[], ifcElement: any, ifcId: any, objectPlacement: Vector3): Promise<any>;
    createModelForExport(projectPlacement: Vector3, north: Vector3, objects: ExportObject[]): Promise<void>;
}
