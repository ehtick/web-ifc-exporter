import { ThreeScene } from '../utils/scene';
import { IFCExporter } from 'web-ifc-exporter';
import { BoxGeometry, MeshLambertMaterial, Vector3, Mesh } from 'three';
import { IFCFURNISHINGELEMENT } from 'web-ifc';

const threeScene = new ThreeScene();
async function exportModels() {
   const exporter = new IFCExporter();

   const boxGeom = new BoxGeometry();
   const redMaterial = new MeshLambertMaterial({color: 'red'});
   const box = new Mesh(boxGeom, redMaterial);

   exporter.api.SetWasmPath('../utils/');

   await exporter.createModelForExport(new Vector3(), new Vector3(), [
      {
         geometries: [box.geometry],
         geometryMaterials: [box.material],
         placement: new Vector3(),
         ifcElementId: 123,
         ifcElementType: IFCFURNISHINGELEMENT
      }
   ])
}

exportModels();
