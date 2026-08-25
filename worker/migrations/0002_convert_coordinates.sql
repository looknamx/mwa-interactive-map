UPDATE map_state
SET labels_json = '[{"id":"engineering_MWA","label":"อาคารวิศวกรรม กปน.","name":"อาคารวิศวกรรม กปน.","lat":13.880576583012458,"lng":100.54876709758739,"category":"civil","description":"อาคารวิศวกรรม กปน.","downloads":[{"label":"อาคารวิศวกรรม กปน.","url":"https://drive.google.com/file/d/14oZqkL3aKqNn-TJZhUrIrlVZTBF8Vbp9/view?usp=sharing","sample":false}]},{"id":"SLUDE LAGOON NO.1","label":"SLUDE LAGOON NO.1","name":"SLUDE LAGOON NO.1","lat":13.879736583012458,"lng":100.55492709758739,"category":"production","description":"SLUDE LAGOON NO.1","downloads":[{"label":"SLUDE LAGOON NO.1","url":"https://drive.google.com/file/d/1WyV7shee7BmJ_6_Irpt_5SNoG9KqPSVd/view","sample":false}]}]',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
