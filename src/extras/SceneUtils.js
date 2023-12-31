var SceneUtils = {
	
	loadScene : function( url, callback_sync, callback_async, callback_progress ) {

		var worker = new Worker( url );
		worker.postMessage( 0 );

		worker.onmessage = function( event ) {

			var dg, dm, dd, dl, dc, df, dt,
				g, o, m, l, p, c, t, f, tt, pp,
				geometry, material, camera, fog, 
				texture, images,
				materials,
				data, loader, 
				counter_models, counter_textures,
				total_models, total_textures,
				result;

			data = event.data;
			loader = new MThree.Loader();
			
			counter_models = 0;
			counter_textures = 0;
			
			result = {
				
				scene: new MThree.Scene(),
				geometries: {},
				materials: {},
				textures: {},
				objects: {},
				cameras: {},
				lights: {},
				fogs: {}
			
			};
			
			function handle_objects() {
				
				for( dd in data.objects ) {
					
					if ( !result.objects[ dd ] ) {
						
						o = data.objects[ dd ];
						
						geometry = result.geometries[ o.geometry ];
						
						if ( geometry ) {
							
							materials = [];
							for( i = 0; i < o.materials.length; i++ ) {
								
								materials[ i ] = result.materials[ o.materials[i] ];
								
							}
							
							p = o.position;
							r = o.rotation;
							s = o.scale;
							
							object = new MThree.Mesh( geometry, materials );
							object.position.set( p[0], p[1], p[2] );
							object.rotation.set( r[0], r[1], r[2] );
							object.scale.set( s[0], s[1], s[2] );
							object.visible = o.visible;
							
							result.scene.addObject( object );
							
							result.objects[ dd ] = object;
							
						}
						
					}
					
				}
				
			};
			
			function handle_mesh( geo, id ) {
				
				result.geometries[ id ] = geo; 
				handle_objects();
				
			};
			
			function create_callback( id ) {
				
				return function( geo ) {
					
					handle_mesh( geo, id );
					
					counter_models -= 1;
					
					async_callback_gate();
					
				}
				
			};
			
			function async_callback_gate() {
				
				var progress = {
					
					total_models: total_models,
					total_textures: total_textures,
					loaded_models: total_models - counter_models,
					loaded_textures: total_textures - counter_textures
					
				};
				
				callback_progress( progress, result );
				
				if( counter_models == 0 && counter_textures == 0 ) {
					
					callback_async( result );
					
				}
				
			};
			
			var callback_texture = function( images ) {
				
				counter_textures -= 1;
				async_callback_gate();  
				
			};
			
			// first go synchronous elements
			
			// cameras
			
			for( dc in data.cameras ) {
				
				c = data.cameras[ dc ];
				
				if ( c.type == "perspective" ) {
					
					camera = new MThree.Camera( c.fov, c.aspect, c.near, c.far );
					
				} else if ( c.type == "ortho" ) {
					
					camera = new MThree.Camera();
					camera.projectionMatrix = MThree.Matrix4.makeOrtho( c.left, c.right, c.top, c.bottom, c.near, c.far );
					
				}
				
				p = c.position;
				t = c.target;
				camera.position.set( p[0], p[1], p[2] );
				camera.target.position.set( t[0], t[1], t[2] );
				
				result.cameras[ dc ] = camera;
				
			}
			
			// lights
			
			for( dl in data.lights ) {
				
				l = data.lights[ dl ];
				
				if ( l.type == "directional" ) {
				
					p = l.direction;
					
					light = new MThree.DirectionalLight();
					light.position.set( p[0], p[1], p[2] );
					light.position.normalize();
					
				} else if ( l.type == "point" ) {
				
					p = l.position;
					
					light = new MThree.PointLight();
					light.position.set( p[0], p[1], p[2] );
					
				}
				
				c = l.color;
				i = l.intensity || 1;
				light.color.setRGB( c[0] * i, c[1] * i, c[2] * i );
				
				result.scene.addLight( light );
				
				result.lights[ dl ] = light;
				
			}
			
			// fogs
			
			for( df in data.fogs ) {
				
				f = data.fogs[ df ];
				
				if ( f.type == "linear" ) {
					
					fog = new MThree.Fog( 0x000000, f.near, f.far );
				
				} else if ( f.type == "exp2" ) {
					
					fog = new MThree.FogExp2( 0x000000, f.density );
					
				}
				
				c = f.color;
				fog.color.setRGB( c[0], c[1], c[2] );
				
				result.fogs[ df ] = fog;
				
			}
			
			// defaults
			
			if ( result.cameras && data.defaults.camera ) {
				
				result.currentCamera = result.cameras[ data.defaults.camera ];
				
			}
			
			if ( result.fogs && data.defaults.fog ) {
			
				result.scene.fog = result.fogs[ data.defaults.fog ];
				
			}
			
			c = data.defaults.bgcolor;
			result.bgColor = new MThree.Color();
			result.bgColor.setRGB( c[0], c[1], c[2] );
			
			result.bgColorAlpha = data.defaults.bgalpha;

			// now come potentially asynchronous elements
			
			// geometries
			
			// count how many models will be loaded asynchronously
			
			for( dg in data.geometries ) {
				
				g = data.geometries[ dg ];
				
				if ( g.type == "bin_mesh" || g.type == "ascii_mesh" ) {
					
					counter_models += 1;
					
				}
				
			}
			
			total_models = counter_models;
			
			for( dg in data.geometries ) {
				
				g = data.geometries[ dg ];
				
				if ( g.type == "cube" ) {
					
					geometry = new MThree.Cube( g.width, g.height, g.depth, g.segments_width, g.segments_height, null, g.flipped, g.sides );
					result.geometries[ dg ] = geometry;
					
				} else if ( g.type == "plane" ) {
					
					geometry = new MThree.Plane( g.width, g.height, g.segments_width, g.segments_height );
					result.geometries[ dg ] = geometry;
					
				} else if ( g.type == "sphere" ) {
					
					geometry = new MThree.Sphere( g.radius, g.segments_width, g.segments_height );
					result.geometries[ dg ] = geometry;
					
				} else if ( g.type == "cylinder" ) {
					
					geometry = new MThree.Cylinder( g.numSegs, g.topRad, g.botRad, g.height, g.topOffset, g.botOffset );
					result.geometries[ dg ] = geometry;

				} else if ( g.type == "torus" ) {
					
					geometry = new MThree.Torus( g.radius, g.tube, g.segmentsR, g.segmentsT );
					result.geometries[ dg ] = geometry;

				} else if ( g.type == "icosahedron" ) {
					
					geometry = new MThree.Icosahedron( g.subdivisions );
					result.geometries[ dg ] = geometry;
					
				} else if ( g.type == "bin_mesh" ) {
					
					loader.loadBinary( { model: g.url, 
										 callback: create_callback( dg )
										} );
					
				} else if ( g.type == "ascii_mesh" ) {
					
					loader.loadAscii( { model: g.url, 
										callback: create_callback( dg )
										} );
					
				}
				
			}

			// textures
			
			// count how many textures will be loaded asynchronously
			
			for( dt in data.textures ) {
				
				tt = data.textures[ dt ];
				
				if( tt.url instanceof Array ) {
					
					counter_textures += tt.url.length;
					
				} else {
					
					counter_textures += 1;
					
				}
				
			}
			
			total_textures = counter_textures;
			
			for( dt in data.textures ) {
				
				tt = data.textures[ dt ];
				
				if ( tt.mapping != undefined && MThree[ tt.mapping ] != undefined  ) {
					
					tt.mapping = new MThree[ tt.mapping ]();
				
				}
				
				if( tt.url instanceof Array ) {
					
					images = ImageUtils.loadArray( tt.url, callback_texture );
					texture = new MThree.Texture( images, tt.mapping );
					
				} else {
					
					texture = ImageUtils.loadTexture( tt.url, tt.mapping, callback_texture );
					
					if ( MThree[ tt.min_filter ] != undefined )
						texture.min_filter = MThree[ tt.min_filter ];
					
					if ( MThree[ tt.mag_filter ] != undefined )
						texture.mag_filter = MThree[ tt.mag_filter ];
					
				}
				
				result.textures[ dt ] = texture;
				
			}
			
			// materials
			
			for( dm in data.materials ) {
				
				m = data.materials[ dm ];
				
				for( pp in m.parameters ) {
					
					if ( pp == "env_map" || pp == "map" || pp == "light_map" ) {
						
						m.parameters[ pp ] = result.textures[ m.parameters[ pp ] ];
						
					} else if ( pp == "shading" ) {
						
						m.parameters[ pp ] = ( m.parameters[ pp ] == "flat" ) ? MThree.FlatShading : MThree.SmoothShading;
						
					} else if ( pp == "blending" ) {
						
						m.parameters[ pp ] = MThree[ m.parameters[ pp ] ] ? MThree[ m.parameters[ pp ] ] : MThree.NormalBlending;
						
					} else if ( pp == "combine" ) {
						
						m.parameters[ pp ] = ( m.parameters[ pp ] == "MixOperation" ) ? MThree.MixOperation : MThree.MultiplyOperation;
						
					}
					
				}
				
				material = new MThree[ m.type ]( m.parameters );
				result.materials[ dm ] = material;
				
			}
			
			// objects ( synchronous init of procedural primitives )
			
			handle_objects();
			
			// synchronous callback
			
			callback_sync( result );

		};
		
	},

	addMesh: function ( scene, geometry, scale, x, y, z, rx, ry, rz, material ) {

		var mesh = new MThree.Mesh( geometry, material );
		mesh.scale.x = mesh.scale.y = mesh.scale.z = scale;
		mesh.position.x = x;
		mesh.position.y = y;
		mesh.position.z = z;
		mesh.rotation.x = rx;
		mesh.rotation.y = ry;
		mesh.rotation.z = rz;
		scene.addObject( mesh );

		return mesh;

	},

	addPanoramaCubeWebGL: function ( scene, size, textureCube ) {

		var shader = ShaderUtils.lib["cube"];
		shader.uniforms["tCube"].texture = textureCube;

		var material = new MThree.MeshShaderMaterial( { fragment_shader: shader.fragment_shader,
													   vertex_shader: shader.vertex_shader,
													   uniforms: shader.uniforms
													} ),

			mesh = new MThree.Mesh( new MThree.Cube( size, size, size, 1, 1, null, true ), material );

		scene.addObject( mesh );

		return mesh;

	},

	addPanoramaCube: function( scene, size, images ) {

		var materials = [], mesh;
		materials.push( new MThree.MeshBasicMaterial( { map: new MThree.Texture( images[0] ) } ) );
		materials.push( new MThree.MeshBasicMaterial( { map: new MThree.Texture( images[1] ) } ) );
		materials.push( new MThree.MeshBasicMaterial( { map: new MThree.Texture( images[2] ) } ) );
		materials.push( new MThree.MeshBasicMaterial( { map: new MThree.Texture( images[3] ) } ) );
		materials.push( new MThree.MeshBasicMaterial( { map: new MThree.Texture( images[4] ) } ) );
		materials.push( new MThree.MeshBasicMaterial( { map: new MThree.Texture( images[5] ) } ) );

		mesh = new MThree.Mesh( new MThree.Cube( size, size, size, 1, 1, materials, true ), new MThree.MeshFaceMaterial() );
		scene.addObject( mesh );

		return mesh;

	},

	addPanoramaCubePlanes: function ( scene, size, images ) {


		var hsize = size/2, plane = new Plane( size, size ), pi2 = Math.PI/2, pi = Math.PI;

		SceneUtils.addMesh( scene, plane, 1,      0,     0,  -hsize,  0,      0,  0, new MThree.MeshBasicMaterial( { map: new MThree.Texture( images[5] ) } ) );
		SceneUtils.addMesh( scene, plane, 1, -hsize,     0,       0,  0,    pi2,  0, new MThree.MeshBasicMaterial( { map: new MThree.Texture( images[0] ) } ) );
		SceneUtils.addMesh( scene, plane, 1,  hsize,     0,       0,  0,   -pi2,  0, new MThree.MeshBasicMaterial( { map: new MThree.Texture( images[1] ) } ) );
		SceneUtils.addMesh( scene, plane, 1,     0,  hsize,       0,  pi2,    0, pi, new MThree.MeshBasicMaterial( { map: new MThree.Texture( images[2] ) } ) );
		SceneUtils.addMesh( scene, plane, 1,     0, -hsize,       0, -pi2,    0, pi, new MThree.MeshBasicMaterial( { map: new MThree.Texture( images[3] ) } ) );

	}

};
