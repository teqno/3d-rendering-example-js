const WIDTH = 1920, HEIGHT = 1080, DATA_STRIDE = 4;

const writePixelData = (data_out, x, y, r = 255, g = 0, b = 0, a = 255) => {
	x += WIDTH / 2;
	y += HEIGHT / 2;
	const offset = (Math.round(x) + Math.round(y) * WIDTH) * DATA_STRIDE;
	r = Math.round(r);
	g = Math.round(g);
	b = Math.round(b);
	a = Math.round(a);
	data_out[offset] = r;
	data_out[offset + 1] = g;
	data_out[offset + 2] = b;
	data_out[offset + 3] = a;
};

const writeCircle = (data_out, ox, oy, d, isFilled = false, r = 255, g = 0, b = 0, a = 255) => {
	let prevY = null;
	for (let x = -d; x <= d; x++) {
		y = Math.sqrt(d * d - x * x);
		writePixelData(data_out, x + ox, y + oy, r, g, b, a);
		writePixelData(data_out, x + ox, -y + oy, r, g, b, a);
		// Outline interpolation	
		if (prevY !== null) {
			if (y - prevY > 1) {
				for (let yInterp = prevY + 1; yInterp < y; yInterp++) {
					writePixelData(data_out, x + ox, yInterp + oy, r, g, b, a);
					writePixelData(data_out, x + ox, -yInterp + oy, r, g, b, a);
				}
			} else if (prevY - y > 1) {
				for (let yInterp = y + 1; yInterp < prevY; yInterp++) {
					writePixelData(data_out, x - 1 + ox, yInterp + oy, r, g, b, a);
					writePixelData(data_out, x - 1 + ox, -yInterp + oy, r, g, b, a);
				}
			}
		}

		// Fill
		prevY = y;
		if (isFilled) {
			for (let yFill = y; yFill > -y; yFill--) {
				writePixelData(data_out, x + ox, yFill + oy, r, g, b, a);
			}
		}
	}
}

const writeSquare = (data_out, ox, oy, r, isCentered = false, isFilled = false) => {
	if (isCentered) {
		ox -= r / 2;
		oy -= r / 2;
	}

	if (isFilled) {
		for (let x = 0; x < r; x++) {
			for (let y = 0; y < r; y++) {
				writePixelData(data_out, x + ox, y + oy);
			}
		}
		return;
	}

	for (let x = 0; x < r; x++) {
		if (x === 0 || x === r - 1) {
			for (let y = 0; y < r; y++) {
				writePixelData(data_out, x + ox, y + oy);
			}
		} else {
			writePixelData(data_out, x + ox, oy);
			writePixelData(data_out, x + ox, oy + r - 1);
		}
	}
};

const writeVertices3D = (data_out, ox, oy) => {
	// Pyramid
	// x | y | z
	const vertices = math.matrix([
		[-0.1, -0.1, 0],	// 0
		[0.1, -0.1, 0],	// 1
		[0, 0.1, 0.05],	// 2
		[0, -0.1, 0.1],	// 3
	]);

	// Cube
	// const vertices = math.matrix([
	// 	[-0.1, 0.1, 0.1],	// close top left
	// 	[0.1, 0.1, 0.1],	// close top right
	// 	[-0.1, -0.1, 0.1],	// close bottom left
	// 	[0.1, -0.1, 0.1],	// close bottom right
	// 	[-0.1, 0.1, -0.1],	// far top left
	// 	[0.1, 0.1, -0.1],	// far top right
	// 	[-0.1, -0.1, -0.1],	// far bottom left
	// 	[0.1, -0.1, -0.1],	// far bottom right
	// ]);

	// const vertexStride = 3;

	// const sides = [
	// 	0, 1,
	// 	0, 3,
	// 	1, 2,
	// 	2, 0,
	// 	2, 3,
	// 	3, 2,
	// ];
	// const sideStride = 2;

	// Scale
	const scaledPyramid = math.dotMultiply(vertices, 50);
	// Translate
	const translatedPyramid = math.add(scaledPyramid, math.matrix([ox, oy, -60]));
	// Sort vertices to render in correct order, so the vertices closer to the camera appear on top of the further vertices
	const depthSortedPyramid = math.matrix(translatedPyramid.toArray().sort((a, b) => a[2] - b[2]));
	const transformedPyramid = depthSortedPyramid;
	// Depth coordinates
	const zCoords = transformedPyramid.columns()[2];
	// Projection matrix
	// Divide x & y of each vertex by z, therefore getting the x' & y' of a smaller triangle on the near plane.
	// Source: https://www.scratchapixel.com/lessons/3d-basic-rendering/get-started/gentle-introduction-to-computer-graphics-programming.html
	const screenProjection = math.dotDivide(
		transformedPyramid,
		math.dotMultiply(math.matrix(transformedPyramid.columns()[2]), -1)
	);

	screenProjection.rows().forEach((row, index) => {
		const z = zCoords.toArray()[index][0];
		writeCircle(
			data_out,
			row.get([0, 0]) * 1920.0,
			row.get([0, 1]) * 1080.0,
			Math.pow(z, 4) * 0.0000035,
			true,
			255, 0, 0, 255 - Math.pow(z, 4) * 0.00001	// Further objects appear less vibrant
		);
	});
}

let deltaX = 0.05;
const main = () => {
	const canvas = document.getElementById("mycanvas");
	const ctx = canvas.getContext("2d");

	// Initialization
	let x = minX = -10, y = minY = -10;
	let imageData = ctx.createImageData(WIDTH, HEIGHT);
	let { data } = imageData;


	const drawLoop = () => {
		window.requestAnimationFrame(drawLoop);

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		imageData = ctx.createImageData(WIDTH, HEIGHT);
		data = imageData.data;

		writeVertices3D(data, x, y);

		if (x > 10 || x < minX) {
			deltaX = -deltaX;
		}
		x += deltaX;
		y += deltaX;

		// Draw call
		ctx.putImageData(imageData, 0, 0);
	}
	drawLoop();
};

main();
