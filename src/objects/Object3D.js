
import Vector3 from '../core/Vector3'
import Matrix4 from '../core/Matrix4'

const Object3DCounter = { value: 0 };

export default class Object3D {

  constructor() {
    this.id = Object3DCounter.value++;

    this.position = new Vector3();
    this.rotation = new Vector3();
    this.scale = new Vector3(1, 1, 1);

    this.matrix = new Matrix4();
    this.rotationMatrix = new Matrix4();
    this.tmpMatrix = new Matrix4();

    this.screen = new Vector3();

    this.visible = true;
    this.autoUpdateMatrix = true;
  }

  updateMatrix() {
    var p = this.position, r = this.rotation, s = this.scale, m = this.tmpMatrix;

    this.matrix.setTranslation(p.x, p.y, p.z);

    this.rotationMatrix.setRotX(r.x);

    if (r.y != 0) {
      m.setRotY(r.y);
      this.rotationMatrix.multiplySelf(m);
    }

    if (r.z != 0) {
      m.setRotZ(r.z);
      this.rotationMatrix.multiplySelf(m);
    }

    this.matrix.multiplySelf(this.rotationMatrix);

    if (s.x != 0 || s.y != 0 || s.z != 0) {
      m.setScale(s.x, s.y, s.z);
      this.matrix.multiplySelf(m);
    }

  }
}