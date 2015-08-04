$EEstore = (function() {
	var $store,
	$supported = true;
	try {
		$store = window.localStorage;
	} catch($e) {
		$store = null;
	}
	if(!$store) {
		$supported = false;
		$store = {};
	}

	function setItem($key, $value) {
		if($supported) {
			$store.setItem($key, $value);
		} else {
			$store[$key] = $value + '';
		}
	}

	function getItem($key, $value) {
		var $out;
		if($supported) {
			$out = $store.getItem($key);
		} else {
			$out = $store[$key];
			if($out === undefined) {
				$out = null;
			}
		}
		if($out === null) {
			$out = $value;
		}
		return $out;
	}

	function removeItem($key) {
		if($supported) {
			$store.removeItem($key);
		} else {
			delete $store[$key];
		}
	}

	function setObject($key, $value) {
		setItem($key, JSON.stringify($value));
	}

	function getObject($key, $value) {
		var $out = getItem($key, null);
		try {
			$out = JSON.parse($out);
		} catch($e) {}
		if($out === null) {
			$out = $value;
		}
		return $out;
	}

	function getBoolean($key, $value) {
		var $out = getItem($key, null);
		if($out == 'true' || $out === '1') {
			return true;
		} else if($out == 'false' || $out === '0') {
			return false;
		}
		return $value;
	}

	return {setItem: setItem, getItem: getItem, removeItem: removeItem, setObject: setObject, getObject: getObject, getBoolean: getBoolean};
})();