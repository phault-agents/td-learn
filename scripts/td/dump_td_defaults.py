# TD Learning — parameter defaults dump
#
# Records the default value, menu entries, page and label of every parameter of every operator
# type the course site knows about, straight from your TouchDesigner build. The official docs
# don't list defaults, so this file is what lets the site mark "already the default" values.
#
# How to run (takes a few seconds; TouchDesigner pauses while it works):
#   1. Start a NEW, empty project (File > New) so nothing of yours is affected.
#   2. Create a Text DAT, paste this whole script into it, right-click the DAT > Run Script.
#   3. It writes td_param_defaults.json next to the project file and prints the path in the
#      Textport (Alt+T). Add that file to the repository as data/td_param_defaults.json.
#
# Operators are created inside a temporary Base COMP with cooking disabled, read, and destroyed
# again, so devices, network ports and windows are never opened.

import json

OP_TYPES = [
    'abletonlinkCHOP', 'accumulatePOP', 'actorCOMP', 'addTOP', 'alembicinPOP', 'alembicoutPOP',
    'ambientlightCOMP', 'analyzeCHOP', 'analyzePOP', 'analyzeTOP', 'angleCHOP', 'animationCOMP',
    'annotateCOMP', 'antialiasTOP', 'artnetDAT', 'attributeCHOP', 'attributePOP', 'attributecombinePOP',
    'attributeconvertPOP', 'audiobandeqCHOP', 'audiobinauralCHOP', 'audiodeviceinCHOP', 'audiodeviceoutCHOP', 'audiodevicesDAT',
    'audiodynamicsCHOP', 'audiofileinCHOP', 'audiofileoutCHOP', 'audiofilterCHOP', 'audiomovieCHOP', 'audiondiCHOP',
    'audiooscillatorCHOP', 'audioparaeqCHOP', 'audioplayCHOP', 'audiorenderCHOP', 'audiospectrumCHOP', 'audiostreaminCHOP',
    'audiostreamoutCHOP', 'audiovstCHOP', 'audiowebrenderCHOP', 'baseCOMP', 'beatCHOP', 'bindCHOP',
    'blacktraxCHOP', 'blendCHOP', 'blendCOMP', 'blendPOP', 'blobtrackCHOP', 'blobtrackTOP',
    'bloomTOP', 'blurTOP', 'bodytrackCHOP', 'boneCOMP', 'boxPOP', 'bulletsolverCHOP',
    'bulletsolverCOMP', 'buttonCOMP', 'cachePOP', 'cacheTOP', 'cacheblendPOP', 'cacheselectPOP',
    'cacheselectTOP', 'cameraCOMP', 'camerablendCOMP', 'channelmixTOP', 'chopexecuteDAT', 'choptoDAT',
    'choptoPOP', 'choptoTOP', 'chromakeyTOP', 'circlePOP', 'circleTOP', 'clipCHOP',
    'clipDAT', 'clipblenderCHOP', 'clockCHOP', 'compositeCHOP', 'compositeTOP', 'connectivityPOP',
    'constantCHOP', 'constantMAT', 'constantTOP', 'constraintCOMP', 'containerCOMP', 'convertDAT',
    'convertPOP', 'convolveTOP', 'copyCHOP', 'copyPOP', 'cornerpinTOP', 'countCHOP',
    'cplusplusCHOP', 'cplusplusDAT', 'cplusplusPOP', 'cplusplusTOP', 'cropTOP', 'crossCHOP',
    'crossTOP', 'cubemapTOP', 'curvePOP', 'cycleCHOP', 'datexecuteDAT', 'dattoCHOP',
    'dattoPOP', 'delayCHOP', 'deleteCHOP', 'deletePOP', 'depthMAT', 'depthTOP',
    'differenceTOP', 'dimensionPOP', 'directdisplayoutTOP', 'directxinTOP', 'directxoutTOP', 'displaceTOP',
    'dmxfixturePOP', 'dmxinCHOP', 'dmxoutCHOP', 'dmxoutPOP', 'edgeTOP', 'embossTOP',
    'engineCOMP', 'envelopeCHOP', 'environmentlightCOMP', 'errorDAT', 'etherdreamCHOP', 'etherdreamDAT',
    'evaluateDAT', 'eventCHOP', 'examineDAT', 'executeDAT', 'expressionCHOP', 'extendCHOP',
    'extrudePOP', 'facetPOP', 'facetrackCHOP', 'fanCHOP', 'fbxCOMP', 'feedbackCHOP',
    'feedbackPOP', 'feedbackTOP', 'fieldCOMP', 'fieldPOP', 'fifoDAT', 'fileinCHOP',
    'fileinDAT', 'fileinPOP', 'fileoutCHOP', 'fileoutDAT', 'fileoutPOP', 'filterCHOP',
    'fitTOP', 'flipTOP', 'folderDAT', 'forceCOMP', 'forceradialPOP', 'freedinCHOP',
    'freedoutCHOP', 'functionCHOP', 'functionTOP', 'geometryCOMP', 'geotextCOMP', 'gestureCHOP',
    'glslCOMP', 'glslMAT', 'glslPOP', 'glslTOP', 'glsladvancedPOP', 'glslcopyPOP',
    'glslmultiTOP', 'glslselectPOP', 'gltfinCOMP', 'gltfoutCOMP', 'gridPOP', 'groupPOP',
    'handleCHOP', 'handleCOMP', 'heliosdacCHOP', 'histogramPOP', 'hogCHOP', 'hokuyoCHOP',
    'holdCHOP', 'hsvadjustTOP', 'hsvtorgbTOP', 'importselectCHOP', 'importselectPOP', 'importselectTOP',
    'impulseforceCOMP', 'inCHOP', 'inDAT', 'inMAT', 'inPOP', 'inTOP',
    'indicesDAT', 'infoCHOP', 'infoDAT', 'insertDAT', 'insideTOP', 'interpolateCHOP',
    'inversecurveCHOP', 'inversekinCHOP', 'joinCHOP', 'joystickCHOP', 'jsonDAT', 'keyboardinCHOP',
    'keyboardinDAT', 'keyframeCHOP', 'kinectCHOP', 'kinectTOP', 'kinectazureCHOP', 'kinectazureTOP',
    'kinectazureselectTOP', 'lagCHOP', 'laserCHOP', 'laserdeviceCHOP', 'layerTOP', 'layermixTOP',
    'layoutTOP', 'leapmotionCHOP', 'leapmotionTOP', 'lensdistortTOP', 'leuzerod4CHOP', 'levelTOP',
    'lfoCHOP', 'lightCOMP', 'limitCHOP', 'limitPOP', 'limitTOP', 'lineMAT',
    'linePOP', 'linebreakPOP', 'linedividePOP', 'linemetricsPOP', 'lineresamplePOP', 'linesmoothPOP',
    'listCOMP', 'logicCHOP', 'lookupCHOP', 'lookupDAT', 'lookupTOP', 'lookupattributePOP',
    'lookupchannelPOP', 'lookuptexturePOP', 'ltcinCHOP', 'ltcoutCHOP', 'lumablurTOP', 'lumalevelTOP',
    'mathCHOP', 'mathPOP', 'mathTOP', 'mathcombinePOP', 'mathmixPOP', 'matteTOP',
    'mediafileinfoDAT', 'mergeCHOP', 'mergeDAT', 'mergePOP', 'midieventDAT', 'midiinCHOP',
    'midiinDAT', 'midiinmapCHOP', 'midioutCHOP', 'mirrorTOP', 'monitorsDAT', 'monochromeTOP',
    'mosysCHOP', 'mosysTOP', 'mouseinCHOP', 'mouseoutCHOP', 'moviefileinTOP', 'moviefileoutTOP',
    'mpcdiDAT', 'mpcdiTOP', 'mqttclientDAT', 'multiplyTOP', 'multitouchinDAT', 'ncamCHOP',
    'ncamTOP', 'ndiDAT', 'ndiinTOP', 'ndioutTOP', 'neighborPOP', 'noiseCHOP',
    'noisePOP', 'noiseTOP', 'normalPOP', 'normalizePOP', 'normalmapTOP', 'notchTOP',
    'nuitrackCHOP', 'nuitrackTOP', 'nullCHOP', 'nullCOMP', 'nullDAT', 'nullMAT',
    'nullPOP', 'nullTOP', 'nvidiabackgroundTOP', 'nvidiadenoiseTOP', 'nvidiaflexTOP', 'nvidiaflexsolverCOMP',
    'nvidiaflowTOP', 'nvidiaflowemitterCOMP', 'nvidiaupscalerTOP', 'oakdeviceCHOP', 'oakselectCHOP', 'oakselectPOP',
    'oakselectTOP', 'objectCHOP', 'oculusaudioCHOP', 'oculusriftCHOP', 'oculusriftTOP', 'opencolorioTOP',
    'openvrCHOP', 'openvrTOP', 'opexecuteDAT', 'opfindDAT', 'opticalflowTOP', 'optitrackinCHOP',
    'opviewerCOMP', 'opviewerTOP', 'orbbecTOP', 'orbbecselectTOP', 'oscinCHOP', 'oscinDAT',
    'oscoutCHOP', 'oscoutDAT', 'ousterTOP', 'ousterselectTOP', 'outCHOP', 'outDAT',
    'outMAT', 'outPOP', 'outTOP', 'outsideTOP', 'overTOP', 'overrideCHOP',
    'packTOP', 'panelCHOP', 'panelexecuteDAT', 'pangolinCHOP', 'pantiltCHOP', 'parameterCHOP',
    'parameterCOMP', 'parameterDAT', 'parameterexecuteDAT', 'pargroupexecuteDAT', 'particlePOP', 'patternCHOP',
    'patternPOP', 'pbrMAT', 'performCHOP', 'performDAT', 'phaserCHOP', 'phaserPOP',
    'phongMAT', 'photoshopinTOP', 'pipeinCHOP', 'pipeoutCHOP', 'planePOP', 'pointPOP',
    'pointfileinPOP', 'pointfileinTOP', 'pointfileselectTOP', 'pointgeneratorPOP', 'pointspriteMAT', 'pointtransformTOP',
    'polygonizePOP', 'poptoCHOP', 'poptoDAT', 'poptoSOP', 'poptoTOP', 'posistagenetCHOP',
    'prefiltermapTOP', 'primitivePOP', 'projectionPOP', 'projectionTOP', 'proximityPOP', 'pulseCHOP',
    'quantizePOP', 'rampTOP', 'randomPOP', 'rayPOP', 'realsenseCHOP', 'realsenseTOP',
    'recordCHOP', 'rectanglePOP', 'rectangleTOP', 'remapTOP', 'renameCHOP', 'renderTOP',
    'renderpassTOP', 'renderpickCHOP', 'renderpickDAT', 'renderselectTOP', 'rendersimpleTOP', 'renderstreaminCHOP',
    'renderstreaminTOP', 'renderstreamoutTOP', 'reorderCHOP', 'reorderDAT', 'reorderTOP', 'replaceCHOP',
    'replicatorCOMP', 'rerangePOP', 'resampleCHOP', 'resolutionTOP', 'revolvePOP', 'rgbkeyTOP',
    'rgbtohsvTOP', 'scalabledisplayTOP', 'scanCHOP', 'screenTOP', 'screengrabTOP', 'scriptCHOP',
    'scriptDAT', 'scriptPOP', 'scriptTOP', 'scurveCHOP', 'selectCHOP', 'selectCOMP',
    'selectDAT', 'selectMAT', 'selectPOP', 'selectTOP', 'serialCHOP', 'serialDAT',
    'serialdevicesDAT', 'sharedmeminCHOP', 'sharedmeminCOMP', 'sharedmeminTOP', 'sharedmemoutCHOP', 'sharedmemoutCOMP',
    'sharedmemoutTOP', 'shiftCHOP', 'shuffleCHOP', 'sickTOP', 'skinPOP', 'skindeformPOP',
    'sliderCOMP', 'slopeCHOP', 'slopeTOP', 'socketioDAT', 'soptoCHOP', 'soptoDAT',
    'soptoPOP', 'sortCHOP', 'sortDAT', 'sortPOP', 'spectrumTOP', 'speedCHOP',
    'spherePOP', 'sphereSOP', 'spliceCHOP', 'springCHOP', 'sprinklePOP', 'ssaoTOP',
    'st2110deviceCHOP', 'st2110inTOP', 'st2110outTOP', 'stretchCHOP', 'stypeTOP', 'stypeinCHOP',
    'stypeoutCHOP', 'subdividePOP', 'substanceTOP', 'substanceselectTOP', 'substituteDAT', 'subtractTOP',
    'switchCHOP', 'switchDAT', 'switchPOP', 'switchTOP', 'syncinCHOP', 'syncoutCHOP',
    'syphonspoutinTOP', 'syphonspoutoutTOP', 'tableCOMP', 'tableDAT', 'tabletCHOP', 'tcpipDAT',
    'textCOMP', 'textDAT', 'textPOP', 'textTOP', 'texture3dTOP', 'texturemapPOP',
    'thresholdTOP', 'tileTOP', 'timeCOMP', 'timecodeCHOP', 'timefilterPOP', 'timelineCHOP',
    'timemachineTOP', 'timerCHOP', 'timesliceCHOP', 'tonemapTOP', 'topologyPOP', 'toptoCHOP',
    'toptoPOP', 'torusPOP', 'touchinCHOP', 'touchinDAT', 'touchinTOP', 'touchoutCHOP',
    'touchoutDAT', 'touchoutTOP', 'tracePOP', 'trailCHOP', 'trailPOP', 'transformCHOP',
    'transformPOP', 'transformTOP', 'transformxyzCHOP', 'transposeDAT', 'triangulatePOP', 'trigPOP',
    'triggerCHOP', 'trimCHOP', 'tubePOP', 'tuioinDAT', 'twistPOP', 'udpinDAT',
    'udpoutDAT', 'underTOP', 'usdCOMP', 'videodeviceinTOP', 'videodeviceoutTOP', 'videodevicesDAT',
    'videostreaminTOP', 'videostreamoutTOP', 'viosoTOP', 'warpCHOP', 'waveCHOP', 'webDAT',
    'webclientDAT', 'webrenderTOP', 'webrtcDAT', 'webserverDAT', 'websocketDAT', 'widgetCOMP',
    'windowCOMP', 'wireframeMAT', 'xmlDAT', 'zedCHOP', 'zedTOP', 'zedselectTOP',
]

# Add type names here to skip them if one ever causes trouble on your machine.
SKIP = []

def _plain(v):
    """Make parameter values JSON-friendly."""
    if isinstance(v, (bool, int, float, str)) or v is None:
        return v
    return str(v)

def _par_info(p):
    info = {'d': _plain(p.default)}
    for key, attr in (('label', 'label'), ('style', 'style'), ('tuplet', 'tupletName')):
        try:
            info[key] = _plain(getattr(p, attr))
        except Exception:
            pass
    try:
        info['page'] = p.page.name if p.page is not None else ''
    except Exception:
        pass
    try:
        mode = str(p.defaultMode)
        if 'EXPRESSION' in mode.upper():
            info['mode'] = 'expr'
            info['expr'] = p.defaultExpr
    except Exception:
        pass
    try:
        if p.isMenu:
            info['menuNames'] = [str(n) for n in p.menuNames]
            info['menuLabels'] = [str(n) for n in p.menuLabels]
    except Exception:
        pass
    return info

result = {
    'build': str(app.build),
    'version': str(app.version),
    'os': str(app.osName),
    'ops': {},
    'failed': {},
}

holder = me.parent().create(baseCOMP, 'tdl_defaults_scratch')
holder.allowCooking = False
try:
    for i, optype in enumerate(OP_TYPES):
        if optype in SKIP:
            continue
        try:
            o = holder.create(optype, initialize=False)
        except Exception as e:
            result['failed'][optype] = str(e)
            continue
        try:
            pars = {}
            for p in o.pars():
                if p.isCustom:
                    continue
                pars[p.name] = _par_info(p)
            result['ops'][optype] = pars
        except Exception as e:
            result['failed'][optype] = 'reading parameters: %s' % e
        finally:
            try:
                o.destroy()
            except Exception:
                pass
        if i % 50 == 0:
            print('[TD Learning] %d / %d operator types...' % (i, len(OP_TYPES)))
finally:
    holder.destroy()

path = project.folder + '/td_param_defaults.json'
with open(path, 'w') as f:
    json.dump(result, f, separators=(',', ':'))

print('[TD Learning] wrote %s' % path)
print('[TD Learning] %d operator types recorded, %d failed (build %s)' % (len(result['ops']), len(result['failed']), result['build']))
for k, v in result['failed'].items():
    print('    could not create %s: %s' % (k, v))
