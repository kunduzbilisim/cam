/*
* 本文件仅供demo使用
*/
 
let curLang = 'English';
//webpack中引用此代码块，格式不要随意改动
  //开发模式需要import,打包给3.0的变成了全局变量，不需要
    
document.querySelector('#device_ipc_tab').addEventListener('click', (event) => {
    event.target.style.color = 'blue';
    document.querySelector('#device_ipc_content').style.display = '';
    ipcFunc();
});
document.querySelector('#onChangeLanguage').addEventListener('change', (event) => {
    let val = event.target.value;
    curLang = val;
    languageTrans();
});
const ipcFunc = () => {
    let $stream,
        $volume,
        $canvas, //canvas播放视频DOM
        $video, //video播放视频DOM
        $ivsCanvas,
        $detectCanvas,
        $drawCanvas, //canvas绘图DOM
        $video_wrap, //视频外层Wrap
        $videoLoading,  //“加载中...”提示
        WndIndex = 0;  //宫格窗口Id
    let channel = 0;  //当前通道
    let curPage = 1;  //视频下载列表的当前页
    let totalPage = 1;  //视频下载列表的总页数
    let recordArr = [];  //视频文件数组
    let canvasInstance = null;  //canvas绘图实例
    let playerInstance = [];  //预览实例数组
    let recordInstance = [];  //录像下载实例数组
    let talkInstance = [];  //对讲实例数组
    let drawInstance = [];  //canvas绘图实例数组
    let cutInstance = [];  //视频裁剪实例数组
    let ivsInstance = []; //智能帧实例数组
    let isCuting = false;  //是否正在进行视频裁剪
    let downList = [];  //勾选的视频下载列表
    let downItemIndex = 0;  //视频下载索引
    let canvasParam = {  //canvas绘图默认传参
        'strokeColor': '#FF0000',
        'title': '',
        'resizeEnable': false,
        'moveEnable': false,
        'closeEnable': true,
        'array': true,
        'showSize': false,
        'selectType': 'inSide',
        'disappear': true,
        'selected': false
    }
    let curDeviceIndex = 0;
    const lINENUMBER = 16; //回放列表每页显示录像条数
    let deviceObject = {
        loginState: [],
        session: []
    }
    let isStartAll = false;
    let curEnlargeWnd = 0;
    let _doc = document.getElementById('device_ipc_content');
    let playbackOptions = {};
    /**
     * @description 初始化
     */
    const init = () => { 
        let videoStr = '';
        for(let i = 0; i < 16; i++) {
            videoStr += '<div wnd-index="' + i + '" style="float: left; background-color: #000; position: relative; width: 100%; height: 100%;overflow:hidden;border:1px solid rgb(125,125,125)">' +
            '<canvas id="h5_canvas_' + i + '" style="width:100%;height:100%;"></canvas>' +
            '<p id="h5_loading_' + i + '" class="video_loading"  style="display:none">加载中...</p>' +
            '<video id="h5_video_' + i + '" style="display: none;width:100%;height:100%;position:absolute;top:0;left:0"></video>' +
            '<canvas id="h5_ivs_' + i + '" style="position: absolute;left: 0;top: 0;width: 100%;height: 100%;" width="500" height="300"></canvas>' + //智能帧的canvas
            '<canvas id="h5_detect_' + i + '" style="position: absolute;left: 0;top: 0;width: 100%;height: 100%;" width="500" height="300"></canvas>' + //智能区域的canvas
            '<canvas id="h5_draw_' + i + '" style="position: absolute;left: 0;top: 0;width: 100%;height: 100%;" width="500" height="300"></canvas>' + //绘制的canvas
            '</div>';
        }
        _doc.querySelector('.h5-play-wrap').innerHTML = videoStr;
        _doc.querySelectorAll('.h5-play-wrap div').forEach((item, index) => {
            item.addEventListener('click', function(event) {
                let _wndIndex = event.target.parentNode.getAttribute('wnd-index') - 0;
                _doc.querySelectorAll('.h5-play-wrap div').forEach(function(item, index) {
                    if(index === _wndIndex) {
                        item.style.borderColor = 'rgb(255, 204, 0)';
                        WndIndex = _wndIndex;
                        curDeviceIndex = item.getAttribute('deviceindex') - 0;
                        setVideoDom();
                    } else {
                        item.style.borderColor = 'rgb(125, 125, 125)';
                    }
                });
            })
        });
        let deviceDom = _doc.querySelectorAll('.h5-menu-list li');
        deviceObject.loginState = new Array(deviceDom.length).fill(false);
        deviceObject.session = new Array(deviceDom.length).fill(0);
        deviceDom.forEach(function(item, index) {
            item.addEventListener('click', async () =>  {
                await onLogout();
                curDeviceIndex = index;
                onLogin();
            });
        });
        $stream = $('#h5_stream');
        $volume = $('#h5_volume');
        $video_wrap = _doc.querySelector('.h5-play-wrap');
        setVideoDom();

        let inputArr = _doc.querySelectorAll('input[btn-for]');
        for(let node of inputArr) {
            node.addEventListener('click', bindClickEvent);
        }

        let selArr = _doc.querySelectorAll('select[sel-for]');
        for(let node of selArr) {
            node.addEventListener('change', bindChangeEvent);
        }

        $volume.addEventListener('input', function(event) {
            let vol = event.target.value - 0;
            $('#h5_volume_value').innerText = vol;
        });
        $volume.addEventListener('change', function(event) {
            let vol = event.target.value - 0;
            if(playerInstance[WndIndex]) {
                playerInstance[WndIndex].setAudioVolume(vol);
            }
        });
        $('#h5_first').addEventListener('click', function() {
            if(curPage != 1) {
                curPage = 1;
                updateTable();
            }
        });
        $('#h5_pre').addEventListener('click', function() {
            if(curPage > 1) {
                curPage = curPage - 1;
                updateTable();
            }
        });
        $('#h5_next').addEventListener('click', function() {
            if(curPage < totalPage) {
                curPage = curPage + 1;
                updateTable();
            }
        });
        $('#h5_last').addEventListener('click', function() {
            if(curPage != totalPage) {
                curPage = totalPage;
                updateTable();
            }
        });
        $('#h5_goPage').addEventListener('click', function() {
            let val = $('#h5_goNumber').value - 0;
            if(curPage != val) {
                curPage = val;
                updateTable();
            }
        });
        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'msfullscreenchange'].forEach((item, index) => {
            document.addEventListener(item, fullscreenchange, false);
        });
        onChangeWdnNum();
    }
    /**
     * @description 切换宫格时重新设置当前视频dom
     */
    const setVideoDom = () => {
        $canvas = $('#h5_canvas_' + WndIndex);
        $video = $('#h5_video_' + WndIndex);
        $drawCanvas  = $('#h5_draw_' + WndIndex);
        $videoLoading = $('#h5_loading_' + WndIndex);
        $ivsCanvas = $('#h5_ivs_' + WndIndex);
        $detectCanvas = $('#h5_detect_' + WndIndex);
        let _session = deviceObject.session[curDeviceIndex];
        let _dom = _doc.querySelector('.h5-menu-list li:nth-child('+(curDeviceIndex+1)+')');
        let ip = _dom.getAttribute('data-ip');
        let port = _dom.getAttribute('data-port');
        setIP(ip + ':' + port);
        if(_session !== 0) {
            _setSession(_session);
        }
    }
    /**
     * @description 登录之后调用，获取设备能力，获取通道、码流
     */
    const afterLogin = () => {
        deviceObject.loginState[curDeviceIndex] = true;
        deviceObject.session[curDeviceIndex] = _getSession();
        $stream.options.length = 0;
        $('#h5_playback_channel').options.length = 0;
        $('#h5_channel').options.length = 0;
        /**
         * RPC.MagicBox.getProductDefinition 获取产品定义
         * @param {string}  'MaxExtraStream' 定义名称
         * @returns {Promise}
         */
        RPC.MagicBox.getProductDefinition('MaxExtraStream').then(function(params) {
            let maxExtra = params.definition;
            let main, extra;
            main = new Option(tl('com.MainStream'), 0);
            main.setAttribute('t', 'com.MainStream');
            $stream.options.add(main);
            if (maxExtra > 1) {
                for(let i = 1; i <= maxExtra; i++) {
                    extra = new Option(tl('com.ExtraStream') + i, i);
                    extra.setAttribute('t', 'com.ExtraStream' + i);
                    $stream.options.add(extra);
                }
            } else {
                extra = new Option(tl('com.ExtraStream'), 1);
                extra.setAttribute('t', 'com.ExtraStream');
                $stream.options.add(new Option(tl('com.ExtraStream'), 1));
            }
        });
        RPC.DevVideoInput.getCollect().then(function (params) {
            let chnls = params.channels;
            for(let i = 0; i < chnls;i++) {
                $('#h5_playback_channel').options.add(new Option(i+1,i));
                $('#h5_channel').options.add(new Option(i+1,i));
            }
        });
        let curDate = new Date();
        let dateString = curDate.toLocaleDateString();
        let dateSplit = dateString.split('/');
        let month = dateSplit[1] - 0;
        if(month < 10) {
            dateSplit[1] = '0' + month;
        }
        let day = dateSplit[2] - 0;
        if(day < 10) {
            dateSplit[2] = '0' + day;
        }
        let date = dateSplit.join('-');
        $('#h5_startTime').value = date + 'T' + '00:00'; 
        $('#h5_endTime').value = date + 'T' + '23:59:59'; 
    }
    const onStartAll = async () => {
        await onLogoutAll()
        curDeviceIndex = 0;
        _doc.querySelector('#h5_draw_' + curDeviceIndex).click();
        isStartAll = true;
        onLogin();
    }
    /**
     * @description 登录
     */
    const onLogin = () => {
        let _dom = _doc.querySelector('.h5-menu-list li:nth-child('+(curDeviceIndex+1)+')');
        let ip = _dom.getAttribute('data-ip');
        let port = _dom.getAttribute('data-port');
        let name = _dom.getAttribute('data-user');
        let pswd = _dom.getAttribute('data-pswd');
        let target = ip + ':' + port;
        setIP(target);
        RPC.login(name, pswd, false).then((res) => {
            setCookie('DWebClientSessionID', '', -1);
            setCookie('DhWebClientSessionID', '', -1);
            /**
             * RPC.keepAlive 保活
             */
            RPC.keepAlive(300, 60000, _getSession(), target, WndIndex);
            afterLogin();
            onRealPreview(ip,port,name,pswd);//登录后拉流
        }).catch((err) => {
            console.log(err);
            loginError(err);
            $videoLoading.style.display = '';
            $videoLoading.innerText = tl('com.OpenFailed'); //打开失败！
            let curWndType = _doc.querySelector('[sel-for=onChangeWdnNum]').value - 0;
            let _newDom = _doc.querySelector('.h5-menu-list li:nth-child(' + (curDeviceIndex + 2) + ')');
            if(curWndType !== 1 && _newDom != null && isStartAll) {
                clickNextWnd();
                _newDom.click();
            };
        });
    }
    const onRealPreview = (ip,port,name,pswd) => {
        if(playerInstance[WndIndex]) {
            playerInstance[WndIndex].stop();
            playerInstance[WndIndex].close();
            playerInstance[WndIndex] = null;
            let dom = $canvas;
            if (dom.style.display === 'none') {
                dom = $video;
            }
            dom.style.display = 'none';
        }
        let player = null;
        let curChannel = channel + 1; //无插件通道号从1开始
        let stream = $stream.value - 0;
        let options = {
            wsURL: 'ws://'+ ip +':' + port + '/rtspoverwebsocket',
            rtspURL: 'rtsp://'+ ip +':' + port + '/cam/realmonitor?channel=' + curChannel + '&subtype='+ stream +'&proto=Private3',
            username: name,
            password: pswd,
            lessRateCanvas:true,
            wndIndex: WndIndex
        };
        player = new PlayerControl(options);
        player.on('MSEResolutionChanged', function (e) {
            console.log(e)
        });
        player.on('PlayStart', function (e) {
            console.log(e);
            $canvas.parentNode.setAttribute('deviceindex', curDeviceIndex);
            $videoLoading.style.display = 'none';
            $ivsCanvas.style.display = '';
            let curWndType = _doc.querySelector('[sel-for=onChangeWdnNum]').value - 0;
            let _newDom = _doc.querySelector('.h5-menu-list li:nth-child(' + (curDeviceIndex + 2) + ')');
            let hasLoginNum = getLoginState();
            if(curWndType !== 1 && _newDom != null && isStartAll && hasLoginNum < curWndType * curWndType) {
                clickNextWnd();
                _newDom.click();
            } else {
                isStartAll = false;
            }
        });
        player.on('DecodeStart', function (e) {
            console.log(e)
            if(e.decodeMode === 'video'){
                $canvas.style.display = 'none';
                $video.style.display = '';
            }else{
                $video.style.display = 'none';
                $canvas.style.display = '';
            }
            canvasInstance = new PluginCanvasES6();
            let instance = new H5Canvas($ivsCanvas, $drawCanvas, $detectCanvas, WndIndex);
            canvasInstance.init($drawCanvas, function (data) {
                rebackActivateLocalEnlarging(data);
            });
            canvasInstance.addChangeShapeEvent();
            playerInstance[WndIndex] = player;
            drawInstance[WndIndex] = canvasInstance;
            ivsInstance[WndIndex] = instance;
        });
        player.on('GetFrameRate', function (e) {
            console.log('GetFrameRate: ' + e)
        });
        player.on('FrameTypeChange', function (e) {
            console.log('FrameTypeChange: ' + e)
        });
        player.on('Error', function (e) {
            //console.log('Error: ' + JSON.stringify(e))
        });
        player.on('WorkerReady',function(){
            player.connect(); 	
        });
        player.on('IvsDraw', function(data, index) {
            let ivsShow = $('#h5_ivs').value;
            let winID = index;
            if(ivsShow === '1') {
                ivsInstance[winID] && ivsInstance[winID].receiveDataFromStream(data, 0);
            } else {
                ivsInstance[winID] && ivsInstance[winID].close();
            }
        });
        player.init($canvas, $video);
        $videoLoading.style.display = '';
        $videoLoading.innerText = tl('com.Loading');
    }
    const onPlayBack = (url, index) => {
        if(playerInstance[WndIndex]) {
            playerInstance[WndIndex].stop();
            playerInstance[WndIndex].close();
            playerInstance[WndIndex] = null;
            let dom = $canvas;
            if (dom.style.display === 'none') {
                dom = $video;
            }
            dom.style.display = 'none';
        }
        let ip = playbackOptions.ip;
        let port = playbackOptions.port;
        let name = playbackOptions.name;
        let pswd = playbackOptions.pswd;
        let player = null;
        let firstTime = 0;
        let options = {
            wsURL: 'ws://'+ ip +':' + port + '/rtspoverwebsocket',
            rtspURL: 'rtsp://'+ ip +':' + port + '/' + url,
            username: name,
            password: pswd,
            lessRateCanvas:true,
            playbackIndex: index,
            wndIndex: WndIndex
        };
        player = new PlayerControl(options);
        player.on('UpdateCanvas', function (e) {
            let playbackIndex = player.playbackIndex;
            if(firstTime === 0){
                firstTime = e.timestamp;//获取录像文件的第一帧的时间戳
            }
            $('#h5_curTime_'+ playbackIndex).innerText = e.timestamp - firstTime;
        });
        player.on('GetTotalTime', function (e) {
            let playbackIndex = player.playbackIndex;
            $('#h5_totalTime_'+ playbackIndex).innerText = e;
        });
        player.on('MSEResolutionChanged', function (e) {
            console.log(e)
        });
        player.on('PlayStart', function (e) {
            console.log(e);
            $canvas.parentNode.setAttribute('deviceindex', curDeviceIndex);
            $videoLoading.style.display = 'none';     
            $ivsCanvas.style.display = '';  
        });
        player.on('DecodeStart', function (e) {
            console.log(e)
            if(e.decodeMode === 'video'){
                $video.style.display = '';
                $canvas.style.display = 'none';
            }else{
                $video.style.display = 'none';
                $canvas.style.display = '';
            }
            canvasInstance = new PluginCanvasES6();
            let instance = new H5Canvas($ivsCanvas, $drawCanvas, $detectCanvas, WndIndex);
            canvasInstance.init($drawCanvas, function (data) {
                rebackActivateLocalEnlarging(data);
            });
            canvasInstance.addChangeShapeEvent();
            playerInstance[WndIndex] = player;
            drawInstance[WndIndex] = canvasInstance;
            ivsInstance[WndIndex] = instance;
        });
        player.on('GetFrameRate', function (e) {
            console.log('GetFrameRate: ' + e)
        });
        player.on('FrameTypeChange', function (e) {
            console.log('FrameTypeChange: ' + e)
        });
        player.on('FileOver', function (e) {
            player.close();
        });
        player.on('IvsDraw', function(data, index) {
            let ivsShow = $('#h5_ivs').value;
            let winID = index;
            if(ivsShow === '1') {
                ivsInstance[winID] && ivsInstance[winID].receiveDataFromStream(data, 0);
            } else {
                ivsInstance[winID] && ivsInstance[winID].close();
            }
        });
        player.on('Error', function (e) {
            //console.log('Error: ' + JSON.stringify(e))
        });
        player.on('WorkerReady',function() {
            player.connect(); 	
        });
        player.init($canvas, $video);
        $videoLoading.style.display = '';
        $videoLoading.innerText = tl('com.Loading');
    }
    const getLoginState = () => {
        let num = 0;
        deviceObject.loginState.map(item => {
            if(item === true) {
                num++;
            }
        });
        return num;
    }
    const clickNextWnd = () => {
        let curWndType = _doc.querySelector('[sel-for=onChangeWdnNum]').value - 0;
        if(curWndType === 2 && WndIndex === 3 || curWndType === 3 && WndIndex === 8 || curWndType === 4 && WndIndex === 15) {
            // _doc.querySelector('#h5_draw_0').click();
        } else {
            _doc.querySelector('#h5_draw_' + (WndIndex + 1)).click();
        }
    }
    /**
     * @description 关闭拉流
     */
    const onStopPreview = () => {
        if(playerInstance[WndIndex]) {
            playerInstance[WndIndex].stop();
            playerInstance[WndIndex].close();
            playerInstance[WndIndex] = null;
            let dom = $canvas;
            if (dom.style.display === 'none') {
                dom = $video;
            }
            dom.style.display = 'none';
        }
        if(talkInstance[WndIndex]) {
            talkInstance[WndIndex].talk('off');
            talkInstance[WndIndex] = null;
        }
        if(recordInstance[WndIndex]) {
            recordInstance[WndIndex].startRecord(false);
            recordInstance[WndIndex] = null;
        }
        $videoLoading.style.display = 'none';
        $ivsCanvas.style.display = 'none';
    }
    const onStopAllPreview = () => {
        for(let i = 0; i < playerInstance.length; i++) {
            if(playerInstance[i]) {
                playerInstance[i].stop();
                playerInstance[i].close();
                playerInstance[i] = null;
                let canvasDom = $('#h5_canvas_' + i);
                let videoDom = $('#h5_video_' + i);
                let ivsCanvas = $('#h5_ivs_' + i);
                let dom = canvasDom;
                if (dom.style.display === 'none') {
                    dom = videoDom;
                }
                dom.style.display = 'none';
                ivsCanvas.style.display = 'none';
            }
        }
        talkInstance.forEach(item => {
            if(item) {
                item.talk('off');
                item = null;
            }
        });
        recordInstance.forEach(item => {
            if(item) {
                item.startRecord(false);
                item = null;
            }
        });
        _doc.querySelectorAll('[id^=h5_loading_]').forEach(item => {
            item.style.display = 'none';
        });
    }
    /**
     * @description 登出当前设备
     */
    const onLogout = async () => {
        let _realDevice = _doc.querySelector('div[wnd-index="'+WndIndex+'"]').getAttribute('deviceindex');
        if(_realDevice === null) {
            return;
        }
        let _session = deviceObject.session[curDeviceIndex];
        if(_session === 0) {
            return;
        }
        _setSession(_session);
        await RPC.Global.logout().then(function() {
            if(playerInstance[WndIndex]) {
                playerInstance[WndIndex].stop();
                playerInstance[WndIndex].close();
                playerInstance[WndIndex] = null;
                let dom = $canvas;
                if (dom.style.display === 'none') {
                    dom = $video;
                }
                dom.style.display = 'none';
            }
            if(talkInstance[WndIndex]) {
                talkInstance[WndIndex].talk('off');
                talkInstance[WndIndex] = null;
            }
            if(cutInstance[WndIndex]) {
                cutInstance[WndIndex].stop();
                cutInstance[WndIndex].close();
                cutInstance[WndIndex] = null;
            }
            if(recordInstance[WndIndex]) {
                recordInstance[WndIndex].startRecord(false);
                recordInstance[WndIndex] = null;
            }
            $videoLoading.style.display = 'none';
            $ivsCanvas.style.display = 'none';
            deviceObject.session[curDeviceIndex] = 0;
            deviceObject.loginState[curDeviceIndex] = false;
            pubsub.publish('_clearTime_', WndIndex);
        });
    }
    /**
     * @description 登出全部设备
     */
    const onLogoutAll = async () => {
        for(let i = 0; i < playerInstance.length; i++) {
            if(playerInstance[i]) {
                playerInstance[i].stop();
                playerInstance[i].close();
                playerInstance[i] = null;
                let canvasDom = $('#h5_canvas_' + i);
                let videoDom = $('#h5_video_' + i);
                let ivsCanvas = $('#h5_ivs_' + i);
                let dom = canvasDom;
                if (dom.style.display === 'none') {
                    dom = videoDom;
                }
                dom.style.display = 'none';
                ivsCanvas.style.display = 'none';
            }
        }
        talkInstance.forEach(item => {
            if(item) {
                item.talk('off');
                item = null;
            }
        });
        recordInstance.forEach(item => {
            if(item) {
                item.startRecord(false);
                item = null;
            }
        });
        _doc.querySelectorAll('[id^=h5_loading_]').forEach(item => {
            item.style.display = 'none';
        });
        let len = deviceObject.session.length; //登出已经登录的全部设备
        for (let i = 0; i < len; i++) {
            if(deviceObject.session[i] != 0) {
                let _dom = _doc.querySelector('.h5-menu-list li:nth-child('+(i+1)+')');
                let ip = _dom.getAttribute('data-ip');
                let port = _dom.getAttribute('data-port');
                setIP(ip + ':' + port);
                _setSession(deviceObject.session[i]);
                await RPC.Global.logout().then(() => {
                    deviceObject.session[i] = 0;
                    deviceObject.loginState[i] = false;
                    _doc.querySelector('div[wnd-index="'+WndIndex+'"]').removeAttribute('deviceindex');
                });
            }
        }
    }
    /**
     * @description 切换码流
     */
    const onChangeStream = () => {
        let _dom = _doc.querySelector('.h5-menu-list li:nth-child('+(curDeviceIndex+1)+')');
        let ip = _dom.getAttribute('data-ip');
        let port = _dom.getAttribute('data-port');
        let name = _dom.getAttribute('data-user');
        let pswd = _dom.getAttribute('data-pswd');
        onRealPreview(ip, port, name, pswd);
    }
     /**
     * @description 切换通道
     */
     const onChangeChannel = () => {
        channel = $('#h5_channel').value - 0;
        let _dom = _doc.querySelector('.h5-menu-list li:nth-child('+(curDeviceIndex+1)+')');
        let ip = _dom.getAttribute('data-ip');
        let port = _dom.getAttribute('data-port');
        let name = _dom.getAttribute('data-user');
        let pswd = _dom.getAttribute('data-pswd');
        onRealPreview(ip, port, name, pswd);
    }
    /**
     * @description 开启音频
     */
    const onTurnOnSound = () => {
        let vol = $volume.value - 0;
        if(playerInstance[WndIndex]) {
            playerInstance[WndIndex].setAudioVolume(vol);
        }
    }
    /**
     * @description 关闭音频
     */
    const onTurnSoundOff = () => {
        if(playerInstance[WndIndex]) {
            playerInstance[WndIndex].setAudioVolume(0);
        }
    }
    /**
     * @description 开启对讲
     */
    const onStartTalk = () => {
        let _realDevice = _doc.querySelector('div[wnd-index="'+WndIndex+'"]').getAttribute('deviceindex');
        if(_realDevice === null) {
            return;
        }
        let talkPlayer = null;
        let _dom = _doc.querySelector('.h5-menu-list li:nth-child(' + (curDeviceIndex + 1) + ')');
        let curChannel = channel + 1; //无插件通道号从1开始
        let ip = _dom.getAttribute('data-ip');
        let port = Number(_dom.getAttribute('data-port'));
        let username = _dom.getAttribute('data-user');
        let password = _dom.getAttribute('data-pswd');
        let rtspURL = 'rtsp://'+ ip +':' + port + '/cam/realmonitor?channel=' + curChannel + '&subtype=5&proto=Private3';
        let optionsAudio = {
            wsURL: 'ws://'+ ip +':' + port + '/rtspoverwebsocket',
            rtspURL: rtspURL,
            username: username,
            password: password,
            isTalkService: true
        }
        talkPlayer = new PlayerControl(optionsAudio);
        talkPlayer.talk('on');
        talkInstance[WndIndex] = talkPlayer;
    }
    /**
     * @description 关闭对讲
     */
    const onStopTalk = () => {
        if(talkInstance[WndIndex]) {
            talkInstance[WndIndex].talk('off');
            talkInstance[WndIndex] = null;
        }
    }
    /**
     * @description 抓图
     */
    const onSnap = () => {
        if(playerInstance[WndIndex]) {
            playerInstance[WndIndex].capture('test');
        }
    }
    /**
     * @description 针对直播的，开始本地下载
     */
    const onStartRecord = () => {
        let _realDevice = _doc.querySelector('div[wnd-index="'+WndIndex+'"]').getAttribute('deviceindex');
        if(_realDevice === null) {
            return;
        }
        let recordPlayer = null;
        let _dom = _doc.querySelector('.h5-menu-list li:nth-child(' + (curDeviceIndex + 1) + ')');
        let curChannel = channel + 1; //无插件通道号从1开始
        let ip = _dom.getAttribute('data-ip');
        let port = Number(_dom.getAttribute('data-port'));
        let username = _dom.getAttribute('data-user');
        let password = _dom.getAttribute('data-pswd');
        let stream = $stream.value - 0;
        let rtspURL = 'rtsp://'+ ip +':' + port + '/cam/realmonitor?channel=' + curChannel + '&subtype='+ stream +'&proto=Private3';
        let optionsRecord = {
            wsURL: 'ws://'+ ip +':' + port + '/rtspoverwebsocket',
            rtspURL: rtspURL,
            username: username,
            password: password
        }
        recordPlayer = new PlayerControl(optionsRecord);
        recordPlayer.startRecord(true);
        recordInstance[WndIndex] = recordPlayer;
        $videoLoading.style.display = '';
        $videoLoading.innerText = tl('com.Recording'); //录像中！
    }
    /**
     * @description 针对直播的，停止本地下载
     */
    const onStopRecord = () => {
        if(recordInstance[WndIndex]) {
            recordInstance[WndIndex].startRecord(false);
            recordInstance[WndIndex] = null;
            $videoLoading.style.display = 'none';
        }
    }
    /**
     * @description 针对回放视频的，视频裁剪
     */
    const onStartCut = () => {
        let _cutIndex = _doc.querySelector('[btn-for=onStartCut]').getAttribute('cutIndex') - 0;
        let cutPlayer = null;
        let ip = playbackOptions.ip;
        let port = playbackOptions.port;
        let username = playbackOptions.name;
        let password = playbackOptions.pswd;       
        let url = recordArr[_cutIndex].FilePath;
        let _rtspURL =  'rtsp://'+ ip +':' + port + '/' + url;
        let cutStartTime = $('#h5_cutStartTime').value;
        let s = new Date(cutStartTime.replace('T', ' ')).getTime();
        let startTime = new Date(recordArr[_cutIndex].StartTime).getTime();
        let range1 = (s - startTime)/1000;
        let optionsRecord = {
            wsURL: 'ws://'+ ip +':' + port + '/rtspoverwebsocket',
            rtspURL: _rtspURL,
            username: username,
            password: password,
            isPrivateProtocol: false, //是否私有协议，默认false
            realm: RPC.realm, //登录返回的设备Realm值
            speed: 16, //倍速拉流，16倍速
            playback: true, //是否是回放
            range: range1 //视频裁剪时间与视频的StartTime时间差值
        }
        cutPlayer = new PlayerControl(optionsRecord);
        cutPlayer.on('WorkerReady',function(){
            cutPlayer.connect(); 	
        });
        cutPlayer.on('FileOver',function(){
            console.log('File Over');
            cutPlayer.startCut(false);
            isCuting = false;	
            $('#h5_cut_process').innerText = '100%';
        });
        cutPlayer.on('UpdateTimeStamp', function (e) {
            let cutStartTime1 = $('#h5_cutStartTime').value;
            let cutEndTime1 = $('#h5_cutEndTime').value;
            let s1 = new Date(cutStartTime1.replace('T', ' ')).getTime() / 1000;
            let e1 = new Date(cutEndTime1.replace('T', ' ')).getTime() / 1000;
            let process = parseInt((1 - (e1 - e.timestamp) / (e1 - s1)) * 100);
            // console.log(new Date(e.timestamp * 1000));
            $('#h5_cut_process').innerText = (process > 100 ? 100 : process)  + '%';
            if((e.timestamp >=  s1) && !isCuting) {
                cutPlayer.startCut(true);
                isCuting = true;
            }
            if((e.timestamp >= e1 ) && isCuting) {
                cutPlayer.startCut(false);
                isCuting = false;
                $('#h5_cut_process').innerText = '100%';
            }
        });
        cutPlayer.init($canvas, $video);
        cutInstance[WndIndex] = cutPlayer;
    }
    /**
     * @description 开启电子放大
     */
    const onStartEnlarge = () => {
        if (drawInstance[WndIndex]) {
            $ivsCanvas.style.display = 'none';
            drawInstance[WndIndex].setRegionNum('rect', 1);
            let param = {...canvasParam};
            drawInstance[WndIndex].drawStart('rect', param);
            curEnlargeWnd = WndIndex;
        }
    }
    /**
     * @description 开启区域放大
     */
    const onStartGridEnlarge = () => {
        _doc.querySelectorAll('[wnd-index]').forEach((item, index) => {
            if(index === WndIndex) {
                _doc.querySelector('[wnd-index="' + WndIndex +'"]').style.width = '100%';
                _doc.querySelector('[wnd-index="' + WndIndex +'"]').style.height = '100%';
                _doc.querySelector('#h5_draw_' + WndIndex).setAttribute('height', 300);
                _doc.querySelector('#h5_draw_' + WndIndex).setAttribute('width', 500);
                drawInstance[WndIndex] && drawInstance[WndIndex].resize();
            } else {
                item.style.display = 'none';
            }
        });
    }
    /**
     * @description 关闭区域放大
     */
    const onCloseGridEnlarge = () => {
        _doc.querySelectorAll('[wnd-index]').forEach((item, index) => {
            item.style.display = '';
        });
        onChangeWdnNum();
    }
    /**
     * @description 关闭电子放大
     */
    const onStopEnlarge = () => {
        let dom = $canvas;
        if (dom.style.display === 'none') {
            dom = $video;
        } 
        dom.style.width = '100%';
        dom.style.height = '100%';
        dom.style.left = 0;
        dom.style.top = 0;
        dom.style.position = 'static';
        $ivsCanvas.style.display = '';
    }
    /**
     * @description 绘制电子放大后的回调函数
     * @param {object} data 矩形框的坐标信息
     */
    const rebackActivateLocalEnlarging = data => {
        if(curEnlargeWnd != WndIndex) return;
        let pos = data.data;
        let newData;
        if (pos[0][0] === pos[1][0]) {
            // return false;
        } else {
            newData = {
                left: pos[0][0],
                top: pos[0][1],
                right: pos[1][0],
                bottom: pos[1][1]
            }
        }
        let dom = $canvas;
        if (dom.style.display === 'none') {
            dom = $video;
        }
        // 倒着画
        if (newData.right < newData.left) {
            let tmp = newData.left;
            newData.left = newData.right;
            newData.right = tmp;
        }

        if (newData.bottom < newData.top) {
            let tmp = newData.top;
            newData.top = newData.bottom;
            newData.bottom = tmp;
        }

        let scaleW = $video_wrap.childNodes[WndIndex].clientWidth / 8191;
        let scaleH = $video_wrap.childNodes[WndIndex].clientHeight / 8191;

        let result = zoomArea(newData.left * scaleW, newData.top * scaleH, newData.right * scaleW, newData.bottom * scaleH, $video_wrap.childNodes[WndIndex].clientWidth,  $video_wrap.childNodes[WndIndex].clientHeight);
        dom.style.width = result.width + 'px';
        dom.style.height = result.height + 'px';
        dom.style.left = result.left + 'px';
        dom.style.top = result.top + 'px';
        dom.style.position = 'absolute';
        drawInstance[WndIndex].removeShapeDrawEvent();
    }
    /**
     * @description 设置全屏
     */
    const onSetFull = () => {
        if (getFull()) {
            exitfullScreen();
        } else {
            setfullScreen();
        }
    }
    /**
     * @description 切换窗口分割
     */
    const onChangeWdnNum = () => {
        let val = _doc.querySelector('[sel-for=onChangeWdnNum]').value;
        let ivsDom =  _doc.querySelectorAll('[id^=h5_draw_]');
        let divDom = _doc.querySelectorAll('.h5-play-wrap div');
        if(val === '1') {
            divDom.forEach(item => {
                item.style.width = '100%';
                item.style.height = '100%';
                item.style.borderColor = '#000';
            });
        } else if(val === '2' ) {
            divDom.forEach((item, index) => {
                item.style.width = 'calc(50% - 2px)';
                item.style.height = 'calc(50% - 2px)';
            });
        } else if(val === '3') {
            divDom.forEach((item,index) => {
                item.style.height = 'calc(33.333% - 2px)';
                item.style.width = 'calc(33.333% - 2px)';
            });
        } else if(val === '4') {
            divDom.forEach((item, index) => {
                item.style.width = 'calc(25% - 2px)';
                item.style.height = 'calc(25% - 2px)';
            });
        }
        ivsDom.forEach(item => {
            item.setAttribute('width', `${item.parentNode.clientWidth}`);
            item.setAttribute('height', `${item.parentNode.clientHeight}`);
        });
        drawInstance.forEach(item => {
            item && item.resize();
        });
        _doc.querySelector('#h5_draw_0').click();
    }
    /**
     * @description 自定义选择器
     * @param {string} str dom元素
     */
    function $(str) {
        if(str.charAt(0) == '#') {
            return document.getElementById(str.substring(1));
        } else if(str.charAt(0) == '.') {
            return _doc.getElementsByClassName(str.substring(1));
        } else {
            return _doc.getElementsByTagName(str);
        }
    }
    /**
     * @description 设置样式
     * @param {object} obj dom元素
     * @param {*} json css样式
     */
    function setStyle (obj, json){
        for(let i in json) {
            obj.style[i] = json[i];
        }
    }
    /**
     * @description 绑定click事件
     * @param {object} event event对象
     */
    function bindClickEvent(event) {
        let $el = event.target,
            method = $el.getAttribute('btn-for'),
            disabled = $el.getAttribute('disabled');
        if(!disabled) {
            eval(method + "()");
        }
    }
    /**
     * @description 绑定change事件
     * @param {object} event event对象
     */
    function bindChangeEvent(event) {
        let $el = event.target,
            method = $el.getAttribute('sel-for'),
            disabled = $el.getAttribute('disabled');
        if(!disabled) {
            eval(method + "()");
        }
    }
    /**
     * @description 转换数据坐标
     * @param {*} x1 左上角x坐标
     * @param {*} y1 左上角y坐标
     * @param {*} x2 右下角x坐标
     * @param {*} y2 右下角y坐标
     * @param {*} width 宫格宽
     * @param {*} height 宫格高
     */
    function zoomArea (x1, y1, x2, y2, width, height) {
        // 小框区域的数据
        let rectArea = {
            width: x2 - x1,
            height: y2 - y1,
            centerX: (x1 + x2) / 2, // 圆心坐标
            centerY: (y1 + y2) / 2
        };
        // 放大比例,控件放大倍数上限是20
        let scale = Math.min(width / rectArea.width, height / rectArea.height, 20);

        // 原始窗口信息
        let sourceWin = {
            width: width,
            height: height,
            centerX: width / 2,
            centerY: height / 2
        };

        // 放大后的窗口区域
        let bigWinArea = {
            width: width * scale,
            height: height * scale,
            left: sourceWin.centerX - rectArea.centerX * scale,
            top: sourceWin.centerY - rectArea.centerY * scale
        };

        // 数据矫正
        if (bigWinArea.left > 0) {
            bigWinArea.left = 0;
        }
        if (bigWinArea.left < sourceWin.width - bigWinArea.width) {
            bigWinArea.left = sourceWin.width - bigWinArea.width;
        }
        if (bigWinArea.top > 0) {
            bigWinArea.top = 0;
        }
        if (bigWinArea.top < sourceWin.height - bigWinArea.height) {
            bigWinArea.top = sourceWin.height - bigWinArea.height;
        }
        return bigWinArea;
    }
    /**
     * @description 获取全屏状态
     */
    function getFull() {
        return window.top.document.mozFullScreen || window.top.document.webkitIsFullScreen || window.top.document.msFullscreenElement;
    }
    /**
     * @description 全屏状态改变的回调事件
     */
    function fullscreenchange() {
        if (getFull()) {
            return;
        } else {
            exitfullScreen();
        }
    }
    /**
     * @description 设置全屏
     */
    function setfullScreen() {
        let docElm = window.top.document.documentElement;
        if (docElm.requestFullScreen) {
            docElm.requestFullScreen();
        } else if (docElm.mozRequestFullScreen) {
            docElm.mozRequestFullScreen();
        } else if (docElm.webkitRequestFullScreen) {
            docElm.webkitRequestFullScreen();
        } else if (docElm.msRequestFullscreen) {
            docElm.msRequestFullscreen();
        }
        handleFullscreen(true);
    }
    /**
     * @description 退出全屏
     */
    function exitfullScreen() {
        let docElm = window.top.document.documentElement;
        if (docElm.exitFullscreen) {
            docElm.exitFullscreen();
        } else if (docElm.mozCancelFullScreen) {
            docElm.mozCancelFullScreen();
        } else if (docElm.webkitCancelFullScreen) {
            docElm.webkitCancelFullScreen();
        } else if (docElm.msExitFullscreen) {
            docElm.msExitFullscreen();
        }
        handleFullscreen(false);
    }
    /**
     * @description 处理全屏开关时的窗口大小
     * @param {boolean} bool 是否要全屏
     */
    function handleFullscreen(bool) {
        if (bool) {
            let wrap = {
                position: 'absolute',
                left: 0,
                top: 0,
                width: window.screen.width + 'px',
                height: window.screen.height + 'px',
                overflow: 'visible'
            }
            setStyle($video_wrap, wrap);
        } else {
            let wrap = {
                position: 'relative',
                overflow: 'hidden',
                width:'500px',
                height: '300px',
            }
            setStyle($video_wrap, wrap);
        }
    }
    /**
     * @description 查询录像
     */
    const onSearchRecord = async () => {
        let allRecords = [];
        let recordNums = 0;
        let playChannel = $('#h5_playback_channel').value - 0;
        let _dom = _doc.querySelector('.h5-menu-list li:nth-child('+(curDeviceIndex+1)+')');
        let _ip = _dom.getAttribute('data-ip');
        let _port = _dom.getAttribute('data-port');
        let _name = _dom.getAttribute('data-user');
        let _pswd = _dom.getAttribute('data-pswd');
        playbackOptions = {
            ip: _ip,
            port: _port,
            name: _name,
            pswd: _pswd
        }
        const getMediaFile = (params) => {
            return new Promise((resolve, reject) => {
                /**
                 * RPC.MediaFileFind.instance 创建媒体文件查找实例
                 * @returns {Promise}
                 */
                RPC.MediaFileFind.instance().then(json => {
                    let queryId = json.result;
                    /**
                     * RPC.MediaFileFind.findFile 设置查找条件，并判断是否存在文件
                     * @param {number} queryId 实例id
                     * @param {object} params condition参数
                     * @returns {Promise}
                     */
                    RPC.MediaFileFind.findFile(queryId, params).then(() => {
                        findNextFile(queryId).then(() => {
                            resolve(true);
                        }).catch((err) => {
                            reject(err);
                        });
                    }).catch((err) => {
                        reject(err);
                    });
                }).catch((err) => {
                    reject(err);
                });
            });
        }
        const findNextFile = (queryId) => {
            return new Promise((resolve, reject) => {
                /**
                 * RPC.MediaFileFind.findNextFile 在指定条件基础上查询文件信息
                 * @param {number} queryId 实例
                 * @param {object} 需要查找的数目
                 * @returns {Promise}
                 */
                RPC.MediaFileFind.findNextFile(queryId, { 'count': 13 }).then(data => {
                    if (Number.isInteger(data.found)) {
                        recordNums = recordNums + data.found;
                        allRecords = allRecords.concat([...data.infos]);
                        if (data.found === 100) {
                            findNextFile(queryId).then(() => {
                                resolve(true);
                            }).catch((err) => {
                                reject(err);
                            });
                        } else {
                            recordArr = [...allRecords];
                            updateInfos(recordArr.slice(0, lINENUMBER));
                            updatePages();
                            stopFind(queryId);
                            resolve(true);
                        }
                    } else {
                        stopFind(queryId);
                        resolve(true);
                    }
                }).catch((err) => {
                    reject(err);
                    stopFind(queryId);
                });

            })
        }
        const stopFind = object => {
            return new Promise((resolve, reject) => {
                /**
                 * PC.MediaFileFind.close 结束查询
                 * @param {number} object 媒体文件查找实例ID
                 * @returns {Promise}
                 */
                RPC.MediaFileFind.close(object).then(() => {
                    /**
                     * PC.MediaFileFind.destroy 销毁媒体文件查找实例
                     * @param {number} object 媒体文件查找实例ID
                     */
                    RPC.MediaFileFind.destroy(object);
                    resolve(true);
                }).catch(() => {
                    reject();
                }).finally(() => {
                });
            })
        }
        const updateInfos = (infos) => {
            let table =  _doc.querySelector('#h5_table tbody');
            table.innerHTML = '';
            for(let i = 0; i < infos.length; i++) {
                let time = infos[i].StartTime + ' - ' + infos[i].EndTime;  //<input type="button" class="h5-button" btn-for="onGoTime" value="GO!">
                let size = Math.round(infos[i].Length / 1024);
                let newRow = table.insertRow(-1);
                newRow.innerHTML = `<td><input type="checkbox" id="h5_check_${i}"></td><td>${i+1}</td><td>${time}</td><td>${size}</td><td><span id="h5_curTime_${i}">--</span><span>/</span><span id="h5_totalTime_${i}">--</span><input type="text" id="h5_goTime_${i}" style="width: 50px;"><input type="button" class="h5-button" id="h5_button_go_${i}" value="GO!"></td>`;
            }
            _doc.querySelectorAll('[id^=h5_button_go_]').forEach(item => {
                item.addEventListener('click', function(event) {
                    let id = item.getAttribute('id').split('_')[3] - 0;
                    onGoTime(id);
                });
            });
            _doc.querySelectorAll('[id^=h5_check_]').forEach(function(item) {
                item.addEventListener('click', function(event) {
                    event.stopPropagation();
                    if(event.target.checked) {
                        //渲染裁剪时间
                        let _index = event.target.getAttribute('id').split('_')[2] - 0;
                        let startTime = recordArr[_index].StartTime.split(' ').join('T');
                        let endTime = recordArr[_index].EndTime.split(' ').join('T');
                        if(startTime.split(':')[2] === '00') {
                            startTime = startTime.substr(0, startTime.length - 3);
                        } 
                        if(endTime.split(':')[2] === '00') {
                            endTime = endTime.substr(0, endTime.length - 3);
                        } 
                        $('#h5_cutStartTime').value = startTime;
                        $('#h5_cutEndTime').value = endTime;
                        _doc.querySelector('[btn-for=onStartCut]').setAttribute('cutIndex', _index);
                    }
                });
            });
            _doc.querySelectorAll('#h5_table tbody tr').forEach(function(item) {
                item.addEventListener('dblclick', function(event) {
                    event.stopPropagation();
                    if(event.target.nodeName === 'TD') {
                        let dom = event.target.parentNode.childNodes[1];
                        let value = dom.innerText - 1;
                        let url = recordArr[value].FilePath;
                        onPlayBack(url, value);
                    }
                });
            });
        }
        const updatePages = () => {
            totalPage = Math.ceil(recordNums/lINENUMBER);
            $('#h5_curPage').innerText = curPage;
            $('#h5_totalPage').innerText = totalPage;
        }
        let tmpDir = [];
        try {
            /**
             * RPC.getDeviceAllInfo 获取存储信息
             * @param {string} 'getDeviceAllInfo' 方法名
             * @return {Promise}
             */
            tmpDir = await RPC.getDeviceAllInfo('getDeviceAllInfo');
        } catch(e) {
            console.log(e);
        }
        let dirs = null;
        if (tmpDir.info && tmpDir.info.length > 1) {
            dirs = 'All';
        }else {
            dirs = tmpDir.info && tmpDir.info[0] && tmpDir.info[0].Detail && tmpDir.info[0].Detail[0] && tmpDir.info[0].Detail[0].Path || '/mnt/sd';
        }

        let startTime = $('#h5_startTime').value.replace('T', ' ');
        let endTime = $('#h5_endTime').value.replace('T', ' ');
        if(startTime.split(' ')[1].split(':').length < 3) {
            startTime = startTime + ':00';
        } 
        if(endTime.split(' ')[1].split(':').length < 3) {
            endTime = endTime + ':00';
        }
        let params = {
            condition: {
                Channel: playChannel,
                Dirs: [dirs],
                StartTime: startTime,
                EndTime: endTime,
                Flags: null,
                Events: ['*'],
                Types: ['dav']
            }
        };
        getMediaFile(params).catch((err) => {
            if (err && err.error && err.error.code === 285409409) {
                alert(tl('com.SDEncryptPlaybackTip')); //回放功能需要确保SD卡经过设备认证
            } else {
                let table =  _doc.querySelector('#h5_table tbody');
                table.innerHTML = '';
                $('#h5_curPage').innerText = 1;
                $('#h5_totalPage').innerText = 1;
                alert(tl('com.NoData')); //无数据
            }
        });
    }
    /**
     * @description 勾选当前页的全部录像
     */
    const onCheckAll = () => {
        let dom = $('#h5_checkAll');
        let ele = _doc.querySelectorAll('[id^=h5_check_]');
        let domChecked = dom.checked;
        ele.forEach((item, index) => {
            item.checked = domChecked;
        })
    }
    /**
     * @description 下载录像
     */
    const onDownload = async () => {
        let ele = _doc.querySelectorAll('[id^=h5_check_]');
        downList = [];
        ele.forEach((item, index) => {
            let _id = item.getAttribute('id').split('_')[2] - 0;
            if(item.checked) {
                recordArr[(curPage - 1) * lINENUMBER + _id].selfCheckIndex = _id;
                downList.push(recordArr[(curPage - 1) * lINENUMBER + _id]);
            }
        });
        downItemIndex = 0;
        onStartDownload(downList[downItemIndex]);
    }
    /**
     * @description 开始下载录像
     * @param {object} item 录像信息
     */
    const onStartDownload = (item) => {
        let _cutIndex;
        if(item) {
            _cutIndex = item.selfCheckIndex;
        }
        let cutPlayer = null;
        let _dom = _doc.querySelector('.h5-menu-list li:nth-child(' + (curDeviceIndex + 1) + ')');
        let ip = _dom.getAttribute('data-ip');
        let port = Number(_dom.getAttribute('data-port'));
        let username = _dom.getAttribute('data-user');
        let password = _dom.getAttribute('data-pswd');
        let url = recordArr[_cutIndex].FilePath;
        let _rtspURL =  'rtsp://'+ ip +':' + port + '/' + url;
        let optionsRecord = {
            wsURL: 'ws://'+ ip +':' + port + '/rtspoverwebsocket',
            rtspURL: _rtspURL,
            username: username,
            password: password,
            isPrivateProtocol: false,
            realm: RPC.realm,
            speed: 16,
            playback: true
        }
        cutPlayer = new PlayerControl(optionsRecord);
        cutPlayer.on('WorkerReady',function(){
            cutPlayer.connect(); 	
        });
        cutPlayer.on('FileOver',function(){
            cutPlayer.startCut(false);
            isCuting = false;	
            $('#h5_down_process').innerText = '100%';
            downItemIndex++;
            if(downList[downItemIndex]) {
                onStartDownload(downList[downItemIndex]);
            }
        });
        cutPlayer.on('UpdateTimeStamp', function (e) {
            let s1 = new Date(item.StartTime).getTime()/1000;
            let e1 = new Date(item.EndTime).getTime()/1000;
            let process = parseInt((1 - (e1 - e.timestamp) / (e1 - s1)) * 100);
            $('#h5_down_process').innerText = (process > 100 ? 100 : process)  + '%';
            if((e.timestamp >=  s1) && !isCuting) {
                cutPlayer.startCut(true);
                isCuting = true;
            }
            if((e.timestamp >= e1 ) && isCuting) {
                cutPlayer.startCut(false);
                isCuting = false;
                $('#h5_down_process').innerText = '100%';
                downItemIndex++;
                if(downList[downItemIndex]) {
                    onStartDownload(downList[downItemIndex]);
                }
            }
        });
        cutPlayer.init($canvas, $video);
        cutInstance[WndIndex] = cutPlayer;
    }
    /**
     * @description 更新录像列表当前页
     */
    const updateTable = () => {
        $('#h5_checkAll').checked = false;
        $('#h5_curPage').innerText = curPage;
        let table =  _doc.querySelector('#h5_table tbody');
        table.innerHTML = '';
        let index = (curPage - 1 ) * lINENUMBER;
        let infos = recordArr.slice(index, index + lINENUMBER);
        for(let i = 0; i < infos.length; i++) {
            let time = infos[i].StartTime + '-' + infos[i].EndTime;
            let size = Math.round(infos[i].Length / 1024) + '(KB)';
            let newRow = table.insertRow(-1);
            newRow.innerHTML = `<td><input type="checkbox" id="h5_check_${i}"></td><td>${index + i+1}</td><td>${time}</td><td>${size}</td><td><span id="h5_curTime_${i}">--</span><span>/</span><span id="h5_totalTime_${i}">--</span><input type="text" id="h5_goTime_${i}" style="width: 50px;"><input type="button" class="h5-button" id="h5_button_go_${i}" value="GO!"></td>`;
        }
        _doc.querySelectorAll('[id^=h5_check_]').forEach(function(item) {
            item.addEventListener('click', function(event) {
                event.stopPropagation();
                if(event.target.checked) {
                    //渲染裁剪时间
                    let _index = event.target.getAttribute('id').split('_')[2] - 0;
                    let startTime = recordArr[_index].StartTime;
                    let endTime = recordArr[_index].EndTime;
                    $('#h5_cutStartTime').value = startTime;
                    $('#h5_cutEndTime').value = endTime;
                    _doc.querySelector('[btn-for=onStartCut]').setAttribute('cutIndex', _index);
                }
            });
        });
        _doc.querySelectorAll('#h5_table tbody tr').forEach(function(item) {
            item.addEventListener('dblclick', function(event) {
                event.stopPropagation();
                let dom = event.target.parentNode.childNodes[1];
                let value = dom.innerText - 1;
                let url = recordArr[value].FilePath;
                onPlayBack(url, value);
            });
        });
    }
    /**
     * @description 暂停回放
     */
    const onPausePlayback = () => {
        if(playerInstance[WndIndex]) {
            playerInstance[WndIndex].pause();
        }
    }
    /**
     * @description 继续回放
     */
    const onContinuePlayback = () => {
        if(playerInstance[WndIndex]) {
            playerInstance[WndIndex].play();
        }
    }
    /**
     * @description 停止回放
     */
    const onClosePlayback = () => {
        if(playerInstance[WndIndex]) {
            playerInstance[WndIndex].stop();
            playerInstance[WndIndex].close();
            playerInstance[WndIndex] = null;
            let dom = $canvas;
            if (dom.style.display === 'none') {
                dom = $video;
            }
            dom.style.display = 'none';
        }
    }
    /**
     * @description 录像跳到指定时间
     * @param 要跳转时间的录像的id
     */
    const onGoTime = (id) => {
        let curTime = $('#h5_goTime_'+id).value - 0;
        if(playerInstance[WndIndex]) {
            playerInstance[WndIndex].playByTime(curTime);
        }
    }
    /**
     * @description ptz云台事件
     * @param {string} type 云台事件类型
     * @param {boolean} isStop 是否停止相应事件
     */
    window.onHandlePTZ = function(type, isStop) {
        let _realDevice = _doc.querySelector('div[wnd-index="'+WndIndex+'"]').getAttribute('deviceindex');
        if(_realDevice === null) {
            return;
        }
        let _session = deviceObject.session[curDeviceIndex];
        _setSession(_session);
        let stepVal = $('#h5_ptz_step').value - 0;
        let arg2 = 0;
        let arg2Arr = ['LeftUp', 'RightUp', 'LeftDown', 'RightDown'];
        let presetArr = ['GotoPreset','SetPreset', 'ClearPreset'];
        let presetNum = $('#h5_preset').value - 0;
        if(arg2Arr.indexOf(type) > -1) {
            arg2 = stepVal;
        }
        if(!isStop) {
            if(presetArr.indexOf(type) > -1) {
                /**
                 * RPC.PTZManager 云台相关
                 * @param {string} 方法
                 * @param {number} channel 通道
                 * @param {object} 参数集合
                 */
                RPC.PTZManager('start', channel, { 'code': type, 'arg1': presetNum, 'arg2': 0, 'arg3': 0 });
            } else {
                RPC.PTZManager('start', channel, { 'code': type, 'arg1': stepVal, 'arg2': arg2, 'arg3': 0 });
            }
        } else {
            RPC.PTZManager('stop', channel, { 'code': type, 'arg1': stepVal, 'arg2': arg2, 'arg3': 0 });
        }
    };
    //进入页面自动初始化
    init();
}
document.querySelector('#device_ipc_tab').click();
/*
* 加载翻译
*/
const languageTrans = () => {
    fetch('./lang/' + curLang + '.txt')
        .then(res => {
            return res.json()
        }).then(text => {
            setLanguage(JSON.parse(JSON.stringify(text)));
            translation(); 
        });
}
languageTrans();


