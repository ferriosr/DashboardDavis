<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$env = parse_ini_file(__DIR__ . '/.env');
$SUPABASE_URL = $env['SUPABASE_URL'] ?? '';
$SUPABASE_KEY = $env['SUPABASE_KEY'] ?? '';

if (!$SUPABASE_URL || !$SUPABASE_KEY) {
    http_response_code(500);
    echo json_encode(['error' => 'Missing environment configuration']);
    exit;
}

function supabase($path, $key) {
    $opts = [
        'http' => [
            'method'  => 'GET',
            'header'  => "apikey: $key\r\nAuthorization: Bearer $key\r\nAccept: application/json\r\n",
            'timeout' => 10,
            'ignore_errors' => true,
        ]
    ];
    $body = @file_get_contents($path, false, stream_context_create($opts));
    return $body !== false ? json_decode($body, true) : null;
}

$type = $_GET['type'] ?? 'latest';

if ($type === 'latest') {
    $url  = "$SUPABASE_URL/rest/v1/lecturas_davis?select=*&order=hora_sensor_utc.desc&limit=1";
    $rows = supabase($url, $SUPABASE_KEY);
    echo json_encode($rows && isset($rows[0]) ? $rows[0] : null);

} elseif ($type === 'history') {
    date_default_timezone_set('America/Mexico_City');
    $desde = date('Y-m-d H:i:s', strtotime('-3 hours'));
    $url   = "$SUPABASE_URL/rest/v1/lecturas_davis"
           . "?select=hora_sensor_utc,aqi,pm2_5,pm10"
           . "&order=hora_sensor_utc.asc"
           . "&hora_sensor_utc=gte." . urlencode($desde)
           . "&limit=180";
    $rows = supabase($url, $SUPABASE_KEY);
    echo json_encode($rows ?? []);

} else {
    http_response_code(400);
    echo json_encode(['error' => 'type must be latest or history']);
}
