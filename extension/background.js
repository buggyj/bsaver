var testmode = false; //set to true to avoid path test

var tiddlywikilocations = "tiddlywikilocations";

var  $ = {"/":"/"};

function datesArray(now,andHours,andMinutes)
{
	var date = [now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()];
	if (andHours) {
		date.push(now.getUTCHours());
	}
	if (andMinutes) {
		date.push(now.getUTCMinutes());
	}
	return date;
}

function equalDateArrays(Ar1,Ar2) {
	if (Ar1.length !== Ar2.length) {
		return false;
	}
	for (var i = 0; i < Ar1.length; i++){
		if (Ar1[i] !== Ar2[i]) return false;
	}
	return true;
}
	
chrome.runtime.getPlatformInfo( function(info) {if(info.os == "win") { $["/"] = "\\"; }
	
var testpath = 'tiddlywikilocations'+$["/"]+'dummydl059723833.html';

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    console.log("savetiddlers: background got message.twdl");
    function dodownload (msg){					
	chrome.downloads.download({
		url: URL.createObjectURL(new Blob([msg.txt], {type: 'text/plain'})),
		filename: 'tiddlywikilocations'+$["/"]+ msg.path,
		conflictAction: 'overwrite'
	},
	function(id) {
		console.log("savetiddlers: saved "+msg.path);
		chrome.storage.local.get({backup:false,minute:true,periodchoice:"day",period:[],backupdir:"backupdir",backedup:{}}, function(items) {
			var newvals={}, newdate = new Date(), 
				date = datesArray(newdate,items.periodchoice == "hour",items.minute), 
				bkdate = newdate.toISOString().slice(0,10);
			if (items.backup === false) {
				sendResponse ("saved");
				return;
			}
			if (equalDateArrays(date, items.period)) {
				if (items.backedup[msg.path]) { 
					sendResponse ("saved");
					return;// already save in this period
				}
				// continue with this peroid
				newvals.backedup = items.backedup;
				newvals.period = items.period;
			} else {
				// new time period
				newvals.backedup = {};
				newvals.period = date;
			} 
			// remember we backedup on this filepath
			newvals.backedup[msg.path] = true;
			chrome.downloads.download({
					url: URL.createObjectURL(new Blob([msg.txt], {type: 'text/plain'})),
					filename: 'tiddlywikilocations'+$["/"]+items.backupdir+$["/"]+msg.path.replace(new RegExp('.{' + msg.path.lastIndexOf(".")  + '}'), '$&' + bkdate),
					conflictAction: 'overwrite'
				},function(id){sendResponse("backupsaved");});
			console.log("savetiddlers: backedup "+msg.path);
			chrome.storage.local.set(newvals);
		});
	});
}
	var path, firstloc = msg.filePath.indexOf($["/"]+tiddlywikilocations+$["/"]);
	
	msg.fPath = msg.filePath.substring(0, firstloc);
	if (firstloc === -1) {
		alert("file not in a sudir to "+tiddlywikilocations+", it will be saved to the download dir");
		path = msg.filePath.split($["/"]);
		msg.path = path[path.length-1];
	}
	else {
		msg.path = msg.filePath.slice(firstloc+tiddlywikilocations.length + "//".length);
		msg.twdl = true;
	}

    // show the choose file dialogue when tw not under 'tiddlywikilocations'
	if (!msg.twdl) {
		console.log("savetiddlers: not in tiddlywikilocations "+msg.path);
		chrome.downloads.download({
			url: URL.createObjectURL(new Blob([msg.txt], {type: 'text/plain'})),
			filename: msg.path,
			saveAs : true
		},function(id){sendResponse("failedloc");});
		
	} else if (testmode) {
		dodownload(msg);//avoid path testing
	} else{ 
		// first download check our destination is valid by download a dummy file first and then reading back the filepath	
		chrome.downloads.download({
			url: URL.createObjectURL(new Blob(["test for savetiddlers"], {type: 'text/plain'})),
			filename: testpath,
			conflictAction: 'overwrite'
			},function(id){chrome.downloads.onChanged.addListener(function hearchange(deltas){
				// wait for completion
				if (deltas.id == id && deltas.state && deltas.state.current === "complete") {
					chrome.downloads.onChanged.removeListener(hearchange);
					chrome.downloads.search({id:id}, function(x){
						//check that our path is the same as request
						if (msg.fPath == x[0].filename.split($["/"]+testpath)[0]) {
							// All tests passed!
							dodownload(msg);
						} else {				
							console.log("savetiddlers: failed path "+msg.fPath +"!="+x[0].filename.split($["/"]+testpath)[0]);
							chrome.downloads.download({
								url: URL.createObjectURL(new Blob([msg.txt], {type: 'text/plain'})),
								filename: msg.path,
								saveAs : true
							},function(id){sendResponse("failedpath");});
						}
						
						chrome.downloads.removeFile(id);
					});
							
				}
				//
			})}
		)
	}
	return true;
})
});
