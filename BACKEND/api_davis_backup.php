<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

SUPABASE_URL = 
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpemRuZ2p3dnZoaWZ3b2tpenZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNzYzMTEsImV4cCI6MjA4ODg1MjMxMX0.9vTLdA1JjaDPdlSSYo6kEykvZ9v4LVGdYxY6bTvil8s";

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
