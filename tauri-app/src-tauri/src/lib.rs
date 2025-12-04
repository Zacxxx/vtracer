use std::path::PathBuf;
use std::str::FromStr;
use vtracer::{Config, Preset};
use visioncortex::PathSimplifyMode;

#[derive(serde::Deserialize)]
struct VTracerOptions {
    colormode: Option<String>,
    hierarchical: Option<String>,
    filter_speckle: Option<usize>,
    color_precision: Option<i32>,
    layer_difference: Option<i32>,
    mode: Option<String>,
    corner_threshold: Option<i32>,
    length_threshold: Option<f64>,
    max_iterations: Option<usize>,
    splice_threshold: Option<i32>,
    path_precision: Option<u32>,
    preset: Option<String>,
}

#[tauri::command]
fn convert_image(input_path: String, options: VTracerOptions) -> Result<String, String> {
    let mut config = if let Some(preset_name) = options.preset {
        let preset = preset_name.parse::<Preset>().map_err(|e| e.to_string())?;
        Config::from_preset(preset)
    } else {
        Config::default()
    };

    if let Some(cm) = options.colormode {
        config.color_mode = vtracer::ColorMode::from_str(&cm).map_err(|e| e.to_string())?;
    }
    if let Some(h) = options.hierarchical {
        config.hierarchical = vtracer::Hierarchical::from_str(&h).map_err(|e| e.to_string())?;
    }
    if let Some(fs) = options.filter_speckle { config.filter_speckle = fs; }
    if let Some(cp) = options.color_precision { config.color_precision = cp; }
    if let Some(ld) = options.layer_difference { config.layer_difference = ld; }

    if let Some(m) = options.mode {
        config.mode = match m.as_str() {
            "polygon" => PathSimplifyMode::Polygon,
            "spline" => PathSimplifyMode::Spline,
            "none" => PathSimplifyMode::None,
            _ => return Err(format!("Unknown mode: {}", m)),
        };
    }

    if let Some(ct) = options.corner_threshold { config.corner_threshold = ct; }
    if let Some(lt) = options.length_threshold { config.length_threshold = lt; }
    if let Some(mi) = options.max_iterations { config.max_iterations = mi; }
    if let Some(st) = options.splice_threshold { config.splice_threshold = st; }
    if let Some(pp) = options.path_precision { config.path_precision = Some(pp); }

    if let Some(pp) = options.path_precision { config.path_precision = Some(pp); }

    let temp_dir = std::env::temp_dir();
    let output_path = temp_dir.join("vtracer_preview.svg");

    vtracer::convert_image_to_svg(
        &PathBuf::from(input_path),
        &output_path,
        config
    ).map_err(|e| e.to_string())?;

    std::fs::read_to_string(&output_path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![convert_image])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
