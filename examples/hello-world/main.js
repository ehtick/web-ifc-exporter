import { ThreeScene } from '../utils/scene';
import { IFCExporter } from 'web-ifc-exporter';

const threeScene = new ThreeScene();
async function exportModels() {
   const exporter = new IFCExporter();
   console.log(exporter);
}

exportModels();
