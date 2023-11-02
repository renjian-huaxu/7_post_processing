import Matrix4 from "../core/Matrix4";
import Vector3 from "../core/Vector3";

export default class Camera {

	constructor(fov, aspect, near, far) {

		this.fov = fov;
		this.aspect = aspect;
		this.near = near;
		this.far = far;
		
		this.position = new Vector3();
		this.target = { position: new Vector3() };
		this.up = new Vector3( 0, 1, 0 );
	
		this.projectionMatrix = null;
		this.matrix = new Matrix4();
	
		this.autoUpdateMatrix = true;

		this.tmpVec = new Vector3();

		this.updateProjectionMatrix();
		
	}

	translateX( amount ) {

		this.tmpVec.sub( this.target.position, this.position ).normalize().multiplyScalar( amount );
		this.tmpVec.crossSelf( this.up );

		this.position.addSelf( this.tmpVec );
		this.target.position.addSelf( this.tmpVec );
	}

	translateZ( amount ) {

		this.tmpVec.sub( this.target.position, this.position ).normalize().multiplyScalar( amount );

		this.position.subSelf( this.tmpVec );
		this.target.position.subSelf( this.tmpVec );

	}

	updateMatrix() {
		this.matrix.lookAt( this.position, this.target.position, this.up );
	}

	updateProjectionMatrix() {
		
		this.projectionMatrix = Matrix4.makePerspective( this.fov, this.aspect, this.near, this.far );
	}

	toString() {
		return 'MCamera ( ' + this.position + ', ' + this.target.position + ' )';
	}
}
