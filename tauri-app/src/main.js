import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";

let inputPath = null;
let currentSvg = null;

const config = {
  preset: "none",
  mode: "spline",
  colormode: "color",
  hierarchical: "stacked",
  filter_speckle: 4,
  color_precision: 6,
  layer_difference: 16,
  corner_threshold: 60,
  length_threshold: 4.0,
  splice_threshold: 45,
  path_precision: 2, // default
};

const presets = {
  bw: {
    colormode: "binary",
    hierarchical: "stacked",
    filter_speckle: 4,
    color_precision: 6,
    layer_difference: 16,
    mode: "spline",
    corner_threshold: 60,
    length_threshold: 4.0,
    splice_threshold: 45,
  },
  poster: {
    colormode: "color",
    hierarchical: "stacked",
    filter_speckle: 4,
    color_precision: 8,
    layer_difference: 16,
    mode: "spline",
    corner_threshold: 60,
    length_threshold: 4.0,
    splice_threshold: 45,
  },
  photo: {
    colormode: "color",
    hierarchical: "stacked",
    filter_speckle: 10,
    color_precision: 8,
    layer_difference: 48,
    mode: "spline",
    corner_threshold: 180,
    length_threshold: 4.0,
    splice_threshold: 45,
  },
};

function updateUI() {
  document.getElementById("mode").value = config.mode;
  document.getElementById("colormode").value = config.colormode;
  document.getElementById("hierarchical").value = config.hierarchical;

  document.getElementById("filter_speckle").value = config.filter_speckle;
  document.getElementById("val-filter_speckle").textContent = config.filter_speckle;

  document.getElementById("color_precision").value = config.color_precision;
  document.getElementById("val-color_precision").textContent = config.color_precision;

  document.getElementById("layer_difference").value = config.layer_difference;
  document.getElementById("val-layer_difference").textContent = config.layer_difference;

  document.getElementById("corner_threshold").value = config.corner_threshold;
  document.getElementById("val-corner_threshold").textContent = config.corner_threshold;

  document.getElementById("length_threshold").value = config.length_threshold;
  document.getElementById("val-length_threshold").textContent = config.length_threshold;

  document.getElementById("splice_threshold").value = config.splice_threshold;
  document.getElementById("val-splice_threshold").textContent = config.splice_threshold;
}

function bindInput(id, key, type = "int") {
  const el = document.getElementById(id);
  el.addEventListener("input", (e) => {
    let val = e.target.value;
    if (type === "int") val = parseInt(val);
    if (type === "float") val = parseFloat(val);
    config[key] = val;

    const display = document.getElementById("val-" + id);
    if (display) display.textContent = val;

    if (document.getElementById("preset").value !== "none") {
      document.getElementById("preset").value = "none";
    }
  });
}

// Bind inputs
bindInput("filter_speckle", "filter_speckle");
bindInput("color_precision", "color_precision");
bindInput("layer_difference", "layer_difference");
bindInput("corner_threshold", "corner_threshold");
bindInput("length_threshold", "length_threshold", "float");
bindInput("splice_threshold", "splice_threshold");

document.getElementById("mode").addEventListener("change", (e) => {
  config.mode = e.target.value;
  document.getElementById("preset").value = "none";
});
document.getElementById("colormode").addEventListener("change", (e) => {
  config.colormode = e.target.value;
  document.getElementById("preset").value = "none";
});
document.getElementById("hierarchical").addEventListener("change", (e) => {
  config.hierarchical = e.target.value;
  document.getElementById("preset").value = "none";
});

document.getElementById("preset").addEventListener("change", (e) => {
  const val = e.target.value;
  if (val !== "none" && presets[val]) {
    Object.assign(config, presets[val]);
    updateUI();
  }
});

async function convert() {
  if (!inputPath) return;

  const loading = document.getElementById("loading");
  loading.style.display = "flex";

  try {
    const svgContent = await invoke("convert_image", {
      inputPath,
      options: config,
    });

    currentSvg = svgContent;
    const previewContainer = document.getElementById("preview-container");
    previewContainer.innerHTML = svgContent;
    previewContainer.classList.add("has-svg");
    document.getElementById("btn-save").disabled = false;
  } catch (e) {
    console.error(e);
    alert("Conversion failed: " + e);
  } finally {
    loading.style.display = "none";
  }
}

document.getElementById("btn-open").addEventListener("click", async () => {
  const file = await open({
    multiple: false,
    filters: [{
      name: 'Images',
      extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif']
    }]
  });

  if (file) {
    inputPath = file.path || file; // tauri v2 returns struct or string depending on config? v2 returns null | string | string[] | FileResponse?
    // In v2 plugin-dialog, open returns string | null | string[] | ...
    // Let's assume string for single file.

    // Show preview of input image?
    // We can't easily show local file path in img src due to security.
    // We can use convert_image to just show result immediately.
    convert();
  }
});

document.getElementById("btn-convert").addEventListener("click", convert);

document.getElementById("btn-save").addEventListener("click", async () => {
  if (!currentSvg) return;

  const path = await save({
    filters: [{
      name: 'SVG',
      extensions: ['svg']
    }]
  });

  if (path) {
    await writeTextFile(path, currentSvg);
    alert("Saved!");
  }
});

// Drag and Drop
const mainEl = document.getElementById("main");

mainEl.addEventListener("dragover", (e) => {
  e.preventDefault();
  mainEl.classList.add("drag-over");
});

mainEl.addEventListener("dragleave", (e) => {
  e.preventDefault();
  mainEl.classList.remove("drag-over");
});

mainEl.addEventListener("drop", async (e) => {
  e.preventDefault();
  mainEl.classList.remove("drag-over");

  const items = e.dataTransfer.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        // In Tauri v2 drag and drop, we might get file paths differently if we use the file-drop event on window,
        // but standard HTML5 drop gives us a File object. 
        // However, for security, browsers don't give full path.
        // Tauri's webview might behave differently or we might need to use tauri's specific file drop event.
        // Let's try to see if we can get the path.

        // Actually, Tauri v2 recommends using the `drag-drop` event from the window or specific plugin if we need paths.
        // But let's check if the File object has a path property in Tauri.
        // In many Tauri versions, File object has a `path` property.

        if (file && file.name) {
          // We need the full path for the rust command.
          // Let's try to rely on the fact that we can't easily get full path from standard drop event in all environments,
          // but in Tauri it's often exposed.

          // If we can't get the path, we might need to read the file as array buffer and pass it to rust, 
          // but our current rust command expects a path.

          // Let's try to use the tauri-plugin-drag-drop if needed, but first let's check if we can just use the payload.
          // Wait, standard HTML5 drag and drop in Tauri usually doesn't give full path for security reasons unless configured?
          // Actually, in Tauri v1 it was possible. In v2, it's safer to use the `tauri://file-drop` event.
        }
      }
    }
  }
});

// Listen to Tauri file drop event
import { listen } from "@tauri-apps/api/event";

listen("tauri://drag-drop", (event) => {
  const paths = event.payload.paths;
  if (paths && paths.length > 0) {
    inputPath = paths[0];
    convert();
  }
});
