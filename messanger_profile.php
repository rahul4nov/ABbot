<?php

$ch = curl_init();

curl_setopt($ch, CURLOPT_URL, "https://graph.facebook.com/v2.6/me/messenger_profile?access_token=EAAczZCe0UQgEBAFqYKqjxkJUwzz91qgeS8B01JnMsSvfQyC7g1ZBzbnYtt08ujxPqq9N9IXDweGZC78jl65COd9GoXYBVUUKUgu3Vu06NuNnxy1ZCDb7vDTnigYe5jmw5BnRZCetVKzhMFeZBAZAuipSSZCnZCX0sENZAZBOz5d4YaOowlsekIKukue");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, "{\"get_started\": \"get_started\"}");
curl_setopt($ch, CURLOPT_POST, 1);

$headers = array();
$headers[] = "Content-Type: application/json";
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$result = curl_exec($ch);
if (curl_errno($ch)) {
    echo 'Error:' . curl_error($ch);
}
print_r($result);
curl_close ($ch);

?>