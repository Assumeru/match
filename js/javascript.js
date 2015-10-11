(function($) {
	var LISTS = './data/lists.json',
	$lists = [],
	$sync = new Sync(2),
	$currentList,
	$currentTest;

	function Sync($num) {
		this.maxNum = $num;
		this.num = 0;
		this.funcs = [];
	}
	Sync.prototype.add = function($func) {
		if(this.num >= this.maxNum) {
			$func();
		} else {
			this.funcs.push($func);
		}
	};
	Sync.prototype.finish = function() {
		var $func;
		this.num++;
		if(this.num >= this.maxNum) {
			while(this.funcs.length > 0) {
				$func = this.funcs.pop();
				$func();
			}
		}
	};

	function shuffle($array) {
		var $n, $k, $out = [];
		for($n = 0; $n < $array.length; $n++) {
			$k = Math.floor(Math.random() * $n);
			$out[$n] = $out[$k];
			$out[$k] = $array[$n];
		}
		return $out;
	}

	function Test($list, $options) {
		if($options.direction == 'first') {
			this.question = 'first';
			this.answer = 'second';
		} else {
			this.answer = 'first';
			this.question = 'second';
		}
		this.repeat = $options.repeat;
		this.words = shuffle($list.words);
		if($options.twice) {
			this.words = this.words.concat(shuffle($list.words));
		}
		this.results = {};
		this.current = null;
		this.title = $list.title;
		this.id = $list.id;
		this.fix();
	}
	Test.prototype.fix = function() {
		var $key, $n,
		$cache = {};
		for($n = 0; $n < this.words.length; $n++) {
			$key = this.words[$n].first + ' ' + this.words[$n].second;
			if($cache[$key] === undefined) {
				$cache[$key] = {
					first: this.words[$n].first,
					second: this.words[$n].second,
					tries: this.words[$n].tries !== undefined ? this.words[$n].tries : 1
				};
			}
			this.words[$n] = $cache[$key];
		}
		if(this.current !== null) {
			$key = this.current.first + ' ' + this.current.second;
			if($cache[$key] !== undefined) {
				this.current = $cache[$key];
			}
		}
	};
	Test.prototype.next = function() {
		this.current = this.words.pop();
	};
	Test.prototype.answerQuestion = function($answer) {
		if($answer == this.current[this.answer]) {
			this.addResult(this.current.tries, 'right');
			return true;
		} else {
			this.addResult(this.current.tries, 'wrong');
			if(this.repeat) {
				this.current.tries++;
				this.words.unshift(this.current);
				this.words.splice(
					Math.min(3, this.words.length),
					0,
					this.current
				);
			}
			return false;
		}
	};
	Test.prototype.addResult = function($tries, $type) {
		if(this.results[$tries] === undefined) {
			this.results[$tries] = {
				right: 0,
				wrong: 0
			};
		}
		this.results[$tries][$type]++;
	};

	function callTestOnly($func) {
		$('[data-type="test-only"]')[$func]();
	}

	function init() {
		var $n, $key,
		$keys = ['answer', 'question', 'repeat', 'words', 'results', 'current', 'title', 'id'],
		$test = $EEstore.getObject('currentTest', null);
		if($test !== null && $test.words !== undefined && $test.words.length > 0) {
			$currentTest = new Test({words: []}, {});
			for($n = 0; $n < $keys.length; $n++) {
				$key = $keys[$n];
				$currentTest[$key] = $test[$key];
			}
			$currentTest.fix();
			$('[data-result]').hide();
			if(window.location.hash.replace('#', '') === '') {
				window.location.hash = 'test';
			}
		} else {
			callTestOnly('hide');
		}
		$(window).on('hashchange', renderPage);
		$('#list form').submit(startTest);
		$('#test form').submit(submitAnswer);
		$('#new [data-type="clear"]').click(function() {
			$('#new [data-type="words"]').empty();
		});
		$('#new [data-type="add"]').click(function() {
			addNewListRows(5);
		});
		$('#new form').submit(submitNewList);
		$('#edit form').submit(submitEditList);
		addNewListRows(10);
		renderPage();
	}

	function loadLists($sync) {
		$.ajax({
			type: 'GET',
			url: LISTS,
			dataType: 'json'
		}).fail(function() {
			window.alert('Failed to load lists.');
		}).done(function($json) {
			$lists = $json;
			$sync.finish();
		});
	}

	function renderPage() {
		var $parts,
		$page = window.location.hash.replace('#', '');
		$('#main > section').hide();
		if($page.indexOf('list-') === 0) {
			$parts = $page.split('-');
			if($parts.length > 1 && $lists[$parts[1]] !== undefined) {
				renderList($lists[$parts[1]]);
			}
		} else if($page == 'test' && $currentTest !== undefined) {
			renderTestPage();
		} else if($page == 'new') {
			renderNewListPage();
		} else if($page.indexOf('edit-') === 0) {
			$parts = $page.split('-');
			if($parts.length > 1 && $lists[$parts[1]] !== undefined) {
				renderEditList($lists[$parts[1]], $parts[1]);
			}
		} else {
			renderListPage();
		}
	}

	function renderEditList($list, $index) {
		var $n, $row,
		$edit = $('#edit'),
		$words = $edit.find('[data-type="words"]');
		$words.empty();
		$edit.find('input[name="title"]').val($list.title);
		$edit.find('input[name="first"]').val($list.first);
		$edit.find('input[name="second"]').val($list.second);
		$edit.find('input[name="id"]').val($index);
		$edit.find('[data-type="file"]').hide();
		for($n = 0; $n < $list.words.length; $n++) {
			$row = $('<tr><td><input type="text" placeholder="First word" name="first_word[]" /></td><td><input type="text" placeholder="Second word" name="second_word[]" /></td></tr>');
			$row.find('[name="first_word[]"]').val($list.words[$n].first);
			$row.find('[name="second_word[]"]').val($list.words[$n].second);
			$words.append($row);
		}
		$edit.show();
	}

	function renderList($list) {
		var $n, $tr, $td, $results, $date,
		$words = $('#list [data-type="words"]'),
		$resultList = $('#list [data-type="results"]');
		$('#list [data-type="title"]').text($list.title);
		$('#list [data-type="first"]').text($list.first);
		$('#list [data-type="second"]').text($list.second);
		$words.empty();
		for($n = 0; $n < $list.words.length; $n++) {
			$tr = $('<tr></tr>');
			$td = $('<td></td>');
			$td.text($list.words[$n].first);
			$tr.append($td);
			$td = $('<td></td>');
			$td.text($list.words[$n].second);
			$tr.append($td);
			$words.append($tr);
		}
		$resultList.empty();
		$results = $EEstore.getObject('results-'+$list.id, []);
		for($n = 0; $n < $results.length; $n++) {
			$date = new Date($results[$n].time);
			$resultList.append('<li><time datetime="'+$results[$n].time+'">'+$date.toLocaleString()+'</time> <strong>'+$results[$n].result+'</strong></li>');
		}
		$currentList = $list;
		$('#list').show();
	}

	function renderListPage() {
		var $n, $li, $a,
		$list = $('#lists ol');
		$list.empty();
		for($n = 0; $n < $lists.length; $n++) {
			$li = $('<li></li>');
			$a = $('<a href="#list-'+$n+'"></a>');
			$a.text($lists[$n].title + ' ('+$lists[$n].first+' to '+$lists[$n].second+') ');
			$li.append($a);
			$a = $('<a href="#edit-'+$n+'" class="btn btn-sm btn-primary">Edit</a>');
			$li.append($a);
			$list.append($li);
		}
		$('#lists').show();
	}

	function renderTestPage() {
		var $input = $('#test [name="answer"]');
		fillResultsTable('test');
		$('#test [data-type="title"]').text($currentTest.title);
		if($currentTest.current === null) {
			$('#test [data-result]').hide();
			$currentTest.next();
		}
		$('#test [data-type="current"]').text($currentTest.current[$currentTest.question]);
		$('#test [data-type="number"]').text($currentTest.words.length);
		$input.val('');
		$('#test').show();
		$input.focus();
	}

	function renderResultPage() {
		var $n, $grade,
		$right = 0,
		$wrong = 0;
		for($n in $currentTest.results) {
			$right += $currentTest.results[$n].right;
			$wrong += $currentTest.results[$n].wrong;
		}
		$grade = Math.round(($right * 900 / ($right + $wrong)) + 100) / 100;
		saveGrade($currentTest.id, $grade);
		$('#results [data-type="grade"]').text($grade);
		fillResultsTable('results');
		$('#results').show();
		$currentTest = undefined;
		callTestOnly('hide');
	}

	function renderNewListPage() {
		$('#new').show();
	}

	function saveGrade($id, $grade) {
		var $results = $EEstore.getObject('results-'+$id, []);
		$results.push({
			time: new Date().toISOString(),
			result: $grade
		});
		$EEstore.setObject('results-'+$id, $results);
	}

	function fillResultsTable($id) {
		var $key,
		$results = $('#'+$id+' [data-type="results"]');
		$results.empty();
		for($key in $currentTest.results) {
			$results.append('<tr><td>'+$key+'</td><td>'+$currentTest.results[$key].right+'</td><td>'+$currentTest.results[$key].wrong+'</td></tr>');
		}
	}

	function startTest($e) {
		$e.preventDefault();
		if($currentList === undefined) {
			window.location.hash = '';
			return;
		}
		$currentTest = new Test($currentList, {
			twice: $('#list [name="double"]').prop('checked'),
			repeat: $('#list [name="repeat"]').prop('checked'),
			direction: $('#list [name="direction"]:checked').val()
		});
		$('#main > section').hide();
		callTestOnly('show');
		window.location.hash = 'test';
	}

	function submitAnswer($e) {
		var $result = $currentTest.answerQuestion($('#test [name="answer"]').val().trim());
		$e.preventDefault();
		if($result) {
			$('#test [data-result="correct"]').show();
			$('#test [data-result="wrong"]').hide();
		} else {
			$('#test [data-result="wrong"]').show();
			$('#test [data-result="correct"]').hide();
			$('#test [data-type="correct"]').text($currentTest.current[$currentTest.answer]);
		}
		if($currentTest.words.length > 0) {
			$currentTest.next();
			renderTestPage();
			$EEstore.setObject('currentTest', $currentTest);
		} else {
			$('#main > section').hide();
			$EEstore.removeItem('currentTest');
			renderResultPage();
		}
	}

	function submitEditList($e) {
		var $list,
		$output = $('#edit [data-type="file"] textarea'),
		$index = $('#edit input[name="id"]').val();
		$e.preventDefault();
		if(!window.confirm('Are you sure?')) {
			return;
		}
		$list = getList($('#edit'));
		$list.id = $lists[$index].id;
		$lists[$index] = $list;
		$('#edit [data-type="file"]').show();
		$output.val(JSON.stringify($lists, null, '\t'));
		$output.focus();
	}

	function getList($element) {
		var $n, $first, $second,
		$list = {
			id: $lists.length,
			title: $element.find('[name="title"]').val().trim(),
			first: $element.find('[name="first"]').val().trim(),
			second: $element.find('[name="second"]').val().trim(),
			words: []
		},
		$rows = $element.find('[data-type="words"] tr');
		for($n = 0; $n < $rows.length; $n++) {
			$first = $($rows[$n]).find('input[name="first_word[]"]').val().trim();
			$second = $($rows[$n]).find('input[name="second_word[]"]').val().trim();
			if($first !== '' || $second !== '') {
				$list.words.push({
					first: $first,
					second: $second
				});
			}
		}
		return $list;
	}

	function submitNewList($e) {
		var $list,
		$output = $('#new [data-type="file"] textarea');
		$e.preventDefault();
		if(!window.confirm('Are you sure?')) {
			return;
		}
		$list = getList($('#new'));
		$lists.push($list);
		$('#new [data-type="words"]').empty();
		addNewListRows(10);
		$('#new input[type="text"]').val('');
		$('#new [data-type="file"]').show();
		$output.val(JSON.stringify($lists, null, '\t'));
		$output.focus();
	}

	function addNewListRows($num) {
		var $first, $row,
		$words = $('#new [data-type="words"]');
		while($num > 0) {
			$row = $('<tr><td><input type="text" placeholder="First word" name="first_word[]" /></td><td><input type="text" placeholder="Second word" name="second_word[]" /></td></tr>');
			$words.append($row);
			if($first === undefined) {
				$first = $row.find('input[name="first_word[]"]');
			}
			$num--;
		}
		$first.focus();
		$('#new [data-type="file"]').hide();
	}

	$sync.add(init);
	loadLists($sync);
	$(function() {
		$sync.finish();
	});
})(jQuery);