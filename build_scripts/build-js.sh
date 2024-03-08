for f in services/frontend/javascript/*.js; do
    java -jar ~/Playground/closure-compiler-v20231112.jar \
    --js $f \
    --js_output_file services/frontend/statics/js/$(basename $f .js).min.js \
    --create_source_map services/frontend/statics/js/$(basename $f .js).min.js.map \
    --source_map_include_content true
done