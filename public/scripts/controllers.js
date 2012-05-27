/*global $:false, Spine:false, Dippa:false, ace:false, require:false, Handlebars:false, _:false */

/*jshint onevar:false, browser:true, eqnull:true */

(function(global) {
    "use strict";

    var Hero = Spine.Controller.sub({

        el: $('#hero'),
        events: {
            'click #create_dippa': 'createDippa',
            'click #step1_done': 'step1Done',
            'click #step2_done': 'step2Done',
            'click #step3_done': 'step3Done',
            'click #step4_done': 'step4Done'
        },
        elements: {
            '#github_instructions': 'instructions',
            '#step1': 'step1',
            '#step2': 'step2',
            '#step3': 'step3',
            '#step4': 'step4',
            '#repository_url': 'repositoryUrl',
            '#repository_url_container': 'repositoryUrlContainer',
            '#admin_link': 'adminLink',
            '#template_list': 'templateList'
        },
        proxied: ['createRequest'],

        createDippa: function() {
            this.instructions.slideDown();
            $('#screenshots').fadeOut();
            $('#info').fadeOut();
            $('#github_ribbon').fadeOut();
        },

        step1Done: function() {
            this.inactivate(this.step1);
            this.activate(this.step2);
        },

        step2Done: function() {
            this.repositoryInfo = Dippa.Github.parseRepositoryUrl(this.repositoryUrl.val());

            if(!this.repositoryInfo) {
                this.repositoryUrlContainer.addClass('error');
                return;
            }

            this.repositoryUrlContainer.removeClass('error').addClass('success');

            this.adminLink.attr('href',
                'https://github.com/' + this.repositoryInfo.owner + '/' +
                    this.repositoryInfo.name + '/admin/collaboration');

            this.inactivate(this.step2);
            this.activate(this.step3);
        },

        step3Done: function() {
            this.inactivate(this.step3);
            this.activate(this.step4);
        },

        step4Done: function() {
            this.template = this.templateList.val();
            this.hideInstructions(this.proxy(function() {
                $('#loader').show();
                this.createRequest();
            }));
        },

        hideInstructions: function(callback) {
            this.instructions.slideUp(this.proxy(function() {
                var oldOffset = this.el.offset();
                var $temp = this.el.clone().appendTo('body');
                $temp.css('position', 'absolute')
                    .css('left', oldOffset.left)
                    .css('width', '820px')
                    .css('top', oldOffset.top)
                    .css('marginTop', 0)
                    .css('zIndex', 1000);
                this.el.hide();

                $temp.animate({
                    left: '-940'
                }, function() {
                    callback();
                });
            }));
        },

        activate: function(el) {
            el.animate({opacity: 1});
            el.find('p').slideDown();
        },

        inactivate: function(el) {
            el.animate({opacity: 0.25});
            el.find('p').slideUp();
        },

        createRequest: function() {
            $.ajax({
                url: 'create',
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({repo: this.repositoryInfo, template: this.template, isDemo: true}),
                error: function(err) {
                    // FIXME
                },
                complete: function(response) {
                    var id = response.responseText;

                    Spine.Route.navigate(Dippa.basepath + id);
                    $('#loader').hide();
                    $('#outer-container').show();
                    $('#editor_container').show('slow');
                }
            });
        }

    }).init();

    var PreviewButton = Spine.Controller.create({
        el: $('#preview_button'),

        events: {
            'click': 'click'
        },

        buttonLoading: function() {
            this.el.button('loading');
        },

        buttonReset: function() {
            this.el.button('reset');
        },

        click: function() {
            window.open('repositories/' + Dippa.id + '/dippa.pdf', '_newtab');
        }

    }).init();

    var DemoButtom = Spine.Controller.create({
        el: $('#demo_button'),

        events: {
            'click': 'click'
        },

        click: function() {
            $('#info').fadeOut();
            $('#screenshots').fadeOut();
            $('#github_ribbon').fadeOut();
            Hero.el.fadeOut(function() {
                $('#loader').show();
                $.ajax({
                    url: 'create',
                    type: 'POST',
                    dataType: 'json',
                    contentType: 'application/json',
                    data: JSON.stringify({isDemo: true}),
                    error: function(err) {
                        // FIXME
                    },
                    complete: function(response) {
                        var id = response.responseText;

                        Spine.Route.navigate(Dippa.basepath + id);
                        $('#loader').hide();
                        $('#outer-container').show();
                        $('#editor_container').show('slow');
                    }
                });
            });
        }

    }).init();

    var SaveButtonClass = Spine.Controller.sub({
        el: $('#save_button'),
        state: "disabled",

        events: {
            'click': 'save'
        },

        init: function() {
            Spine.bind('change', this.proxy(this.documentChanged));
            Spine.bind('initialLoading', this.proxy(this.initialLoading));
        },

        initialLoading: function() {
            this.initialLoadingDone = true;
            this.stateDisable();
        },

        documentChanged: function() {
            this.changed = true;
            if(this.initialLoadingDone && this.state === "disabled") {
                this.stateEnable();
            }
        },

        /**
         * Enables button. This happens when document is changed
         */
        stateEnable: function() {
            this.state = "enabled";
            this.changed = false;
            this.el.button('enable');

            // Enable button
            this.enabled = true;
            this.el.removeClass('disabled');
            this.el.removeAttr('disabled');
        },

        /**
         * Resets buttons state to the default (disabled) state
         */
        stateDisable: function() {
            this.state = "disabled";
            this.el.button('reset');
            this.disableButton();
        },

        /**
         * Changes text to saving text
         */
        stateSaving: function() {
            this.changed = false;
            this.state = "saving";
            this.el.button('saving');
            this.disableButton();
        },

        /**
         * Changes text to "complete" for some seconds
         */
        stateComplete: function(timeout) {
            this.state = "complete";
            timeout = timeout || 1000;

            this.el.button('complete');
            this.disableButton();

            _.delay(function() {
                if(this.changed) {
                    this.stateEnable();
                } else {
                    this.stateDisable();
                }
            }.bind(this), timeout);
        },

        disableButton: function() {
            this.enabled = false;
            this.el.addClass('disabled');
            this.el.attr('disabled', 'disabled');
        },

        save: function() {
            var $saveButton = $(this);
            var $previewButton = $('#preview_button');

            this.stateSaving();
            PreviewButton.buttonLoading();

            $('#console').empty();
            $('#console').append('<span>Saving and compiling document</span><br />');
            $('#console').append('<span></span><br />');
            $('#console').append('<span>Please wait a moment...</span><br />');

            this.sendRequest();
        },

        sendRequest: function() {
            Dippa.Editor.updateContent();

            var value = JSON.stringify({documentContent: Dippa.Editor.docContent.value, referencesContent: Dippa.Editor.refContent.value});

            $.ajax({
                type: "POST",
                url: 'save/' + Dippa.id,
                dataType: 'json',
                contentType: 'application/json',
                data: value,
                processData: false,
                complete: this.proxy(function(response) {
                    this.stateComplete();
                    PreviewButton.buttonReset();
                    Dippa.Editor.setChanged(false);
                }),
                success: this.proxy(function(response) {
                    var $console = $('#console');
                    $console.empty();
                    $.each(response, function(key, value) {
                        $console.append('<span>' + value.output + '</span><br />');
                    });
                })
            });
        }
    });

    var SaveButton = new SaveButtonClass();

    var EditorClass = Spine.Controller.sub({

        init: function() {

        },

        initializeEditor: function() {
            this.editor = ace.edit('editor');
            this.session = this.editor.getSession();
            var LatexMode = require("ace/mode/latex").Mode;

            this.session.setMode(new LatexMode());
            this.session.setUseWrapMode(true);
            this.editor.setShowPrintMargin(false);

            this.changed = false;

            this.editor.commands.addCommand({
                name: 'save',
                bindKey: {
                    win: 'Ctrl-S',
                    mac: 'Command-S',
                    sender: 'editor'
                },
                exec: function(env, args, request) {
                    SaveButton.save();
                }
            });

            this.session.on('change', this.proxy(function() {
                Spine.trigger('change');
                this.setChanged(true);
            }));

            this.session.on('outline', function(outline) {
                Outline.update(outline);
            });
        },

        getValue: function() {
            return this.session.getValue();
        },

        setValue: function(value) {
            this.session.setValue(value);
        },

        setChanged: function(value) {
            this.changed = value;
        },

        hasChanged: function() {
            return this.changed;
        },

        changeType: function(type) {
            if(type === 'doc') {
                this.setContent(this.docContent);
            } else if (type === 'ref') {
                this.setContent(this.refContent);
            } else {
                throw "Illegal type " + type;
            }
        },

        gotoLine: function(lineNumber) {
            this.editor.gotoLine(lineNumber);
        },

        setContent: function(newContent) {
            if(this.content === newContent) {
                return;
            }

            // Update value
            this.updateContent();
            this.content = newContent;
            this.setValue(this.content.value);

            // Set cursor
            if(this.content.cursor) {
                this.setCursorPosition(this.content.cursor);
            }
        },

        updateContent: function() {
            if(!this.content) {
                return;
            }

            this.content.value = this.getValue();
            this.content.cursor = this.getCursorPosition();
        },

        setCursorPosition: function(pos) {
            this.editor.moveCursorToPosition(pos);
        },

        getCursorPosition: function() {
            return this.editor.getCursorPosition();
        },
        
        insert : function(str){
        	this.editor.insert(str);
        }
        
        
    });

    var FilePreview = Spine.Controller.create({
        el: $('#file-preview'),

        proxied: ['clearPreview'],

        elements: {
            '#preview-empty': 'empty',
            '#preview-iframe': 'iframe',
            '#preview-image': 'image'
        },

        init: function() {

        },

        previewFile: function(item) {
            var previewPath = 'repositories/' + Dippa.id + '/',
                isPDF = item.filename.match(/\.pdf$/),
                target = isPDF ? this.iframe : this.image,
                toBeHidden = isPDF ? this.image : this.iframe;

            this.bindListeners(item);
            this.empty.hide();

            target.attr('src', previewPath + item.filename).show();
            toBeHidden.hide();
        },

        bindListeners: function(item) {
            if(this.currentItem) {
                this.currentItem.unbind("destroy", this.clearPreview);
            }

            this.currentItem = item;

            if(this.currentItem) {
                item.bind("destroy", this.proxy(this.clearPreview));
            }
        },

        clearPreview: function() {
            this.bindListeners(null);
            this.image.hide();
            this.iframe.hide();
            this.empty.show();
        }

    }).init();

    var FileItem = Spine.Controller.sub({

        // Delegate the click event to a local handler
        events: {
            "click .preview-file": "preview",
            "click .remove-file": "remove"
        },

        tag: 'li',

        // Bind events to the record
        init: function() {
            if ( !this.item ) throw "@item required";
            this.item.bind("update", this.proxy(this.render));
            this.item.bind("destroy", this.proxy(this.removeEl));
        },

        render: function(item){
            if (item) this.item = item;

            this.html(FileItem.template(this.item));
            return this;
        },

        removeEl: function() {
            this.el.remove();
        },

        // Called after an element is destroyed
        remove: function(){
            $.ajax({
                type: 'DELETE',
                url: 'upload/' + Dippa.id + '/' + this.item.filename,
                success: this.proxy(function() {
                    this.item.destroy();
                })
            });
        },

        preview: function() {
            FilePreview.previewFile(this.item);
        },

        click: function(){

        }
    }, {
        template: Handlebars.compile($("#filelistitem-template").html())
    });

    var Files = Spine.Controller.sub({
        el: $('#filelist'),

        init: function(){
            Dippa.File.bind("refresh", this.proxy(this.addAll));
            Dippa.File.bind("create",  this.proxy(this.addOne));
        },

        addOne: function(item){
            var file = new FileItem({item: item});
            this.append(file.render());
        },

        addAll: function(){
            Dippa.File.each(this.proxy(this.addOne));
        }
    });

    var OutlineItem = Spine.Controller.sub({
        events: {"click": "goto"},

        tag: 'li',

        init: function() {},

        render: function(item) {
            if (item) this.item = item;

            // Indent
            var level = this.item.level || 0;
            var indent = (10 * level) + 'px;';
            this.item.indent = indent;

            this.html(OutlineItem.template(this.item));

            return this;
        },

        goto: function() {
            var lineNumber = this.item.line || null;

            if(lineNumber != null) {
                Dippa.Editor.gotoLine(lineNumber);
            }
        }
    }, {
        template: Handlebars.compile($("#outlinelistitem-template").html())
    });

    var Outline = Spine.Controller.create({
        el: $('#outline_list'),

        init: function() {

        },

        update: function(outline) {
            this.el.empty();
            this.el.append('<li class="nav-header">Document outline</li>');

            outline.forEach(function(item) {
                var outlineItem = new OutlineItem({item: item});
                this.append(outlineItem.render());
            }.bind(this));
        }


    }).init();
    
	
	function EquationButtonData(filename, latexForm){
		this.path = "../img/equation_editor/";
		this.img_src = this.path + filename;
		this.latexForm = latexForm;
		this.className = "btn equation_button";
		
	}
	
	var SuperScriptsButtonData = [
		new EquationButtonData("superscript1.gif", "x^{a}"),
		new EquationButtonData("superscript2.gif", "x_{a}"),
		new EquationButtonData("superscript3.gif", "x_{b}^{a}"),
		new EquationButtonData("superscript4.gif", "{x_{a}}^{b}"),
		new EquationButtonData("superscript5.gif", "_{a}^{b}\\textrm{C}")
		
		
	
	];
	
	var FractionButtonData = [
		new EquationButtonData("fraction1.gif", "\\frac{a}{b}"),
		new EquationButtonData("fraction2.gif", "x\\tfrac{a}{b}"),
		new EquationButtonData("fraction3.gif", "\\frac{\\partial}{\\partial x}"),
		new EquationButtonData("fraction4.gif", "\\frac{\\partial^2}{\\partial x^2}"),
		new EquationButtonData("fraction5.gif", "\\frac{\\mathrm{d}}{\\mathrm{d} x}"),
	
	]
	
	var IntegralButtonData = [
			new EquationButtonData("integral1.gif", "\\int"),
			new EquationButtonData("integral2.gif", "\\int_{a}^{b}"),
			new EquationButtonData("integral3.gif", "\\oint"),
			new EquationButtonData("integral4.gif", "\\oint_{a}^{b}"),
			new EquationButtonData("integral5.gif", "\\iint_{a}^{b}")

		
	];
	
	var CapButtonData = [
		new EquationButtonData("cap1.gif", "\\bigcap"),
		new EquationButtonData("cap2.gif", "\\bigcap_{a}^{b}"),
		new EquationButtonData("cap3.gif", "\\bigcup"),
		new EquationButtonData("cap4.gif", "\\bigcup_{a}^{b}"),
		new EquationButtonData("cap5.gif", "\\lim_{n \\to \\infty }")
	];
	
	var SumButtonData = [
		new EquationButtonData("sum1.gif", "\\sum"),
		new EquationButtonData("sum2.gif", "\\sum_{a}^{b}"),
		new EquationButtonData("sum3.gif", "\\sqrt{x}"),
		new EquationButtonData("sum4.gif", "\\sqrt[x]{y}"),
		
		
	
	];
	
	var BracketButtonData = [
		new EquationButtonData("bracket1.gif", "\\left ( \\right )"),
		new EquationButtonData("bracket2.gif", "\\left [ \\right ]"),
		new EquationButtonData("bracket3.gif", "\\left { \\right }"),
		new EquationButtonData("bracket4.gif", "\\left | a\\right |")
		
		
	];
	
	var StyleButtonData = [
		new EquationButtonData("style1.gif", "\\textup{Upright}"),
		new EquationButtonData("style2.gif", "\\textbf{Bold}"),
		new EquationButtonData("style3.gif", "\\textit{Italic}"),
		new EquationButtonData("style4.gif", "\\textrm{Roman}"),
		new EquationButtonData("style5.gif", "\\textsl{Slanted}"),
		new EquationButtonData("style6.gif", "\\texttt{Typewriter}"),
		new EquationButtonData("style7.gif", "\\textsc{small caps}"),
		new EquationButtonData("style8.gif", "\\emph{Emphasis}")

	
	];
	
	var GreekLetterButtonData = [
		new EquationButtonData("alpha.gif", "\\alpha"),
		new EquationButtonData("beta.gif", "\\beta"),
		new EquationButtonData("gamma.gif", "\\gamma"),
		new EquationButtonData("delta.gif", "\\delta"),
		new EquationButtonData("epsilon.gif", "\\epsilon"),
		new EquationButtonData("theta.gif", "\\theta"),
		new EquationButtonData("lambda.gif", "\\lambda"),
		new EquationButtonData("pi.gif", "\\pi"),
		new EquationButtonData("sigma.gif", "\\sigma"),
		new EquationButtonData("phi.gif", "\\phi"),
		
	
	];
	
	var SymbolButtonData = [
		new EquationButtonData("symbol1.gif", "\\mathbb{P}"),
		new EquationButtonData("symbol2.gif", "\\mathbb{N}"),
		new EquationButtonData("symbol3.gif", "\\mathbb{Z}"),
		new EquationButtonData("symbol4.gif", "\\mathbb{I}"),
		new EquationButtonData("symbol5.gif", "\\mathbb{Q}"),
		new EquationButtonData("symbol6.gif", "\\mathbb{R}"),
		new EquationButtonData("symbol7.gif", "\\mathbb{C}"),
	
	];
	
	StyleButtonData.forEach(function(buttonData){
		buttonData.className = "btn   equation_button_wide equation_button";
	});
		
	var EquationButtonDataCollection = [ 
			SuperScriptsButtonData,
			FractionButtonData,
			IntegralButtonData,
			CapButtonData,
			SumButtonData,
			BracketButtonData,
			StyleButtonData,
			GreekLetterButtonData,
			SymbolButtonData
			
	];
	
		
	var EquationEditorButtonGroup = Spine.Controller.sub({
		
		init : function(buttonGroupData){
			this.buttonGroupData = buttonGroupData;
		},
		
		className : "equation_button_group",
		
		events: {"mouseenter":"showButtons", "mouseleave": "hideButtons"},
		
		render : function(){
			var topButtonData = this.buttonGroupData[0];
			var topButton = EquationEditorButton.init(topButtonData);
			this.append(topButton.render());
			this.append(DummySpace.init());
			this.append( EquationEditorButtonGroupContent.init( this.buttonGroupData ).render());
			return this;
		},
		
		showButtons: function(event){
			var $content = this.getGroupContent(event);
			var $currentGroup = $content.parent();
			var dummyHeight = $currentGroup.children(".equation_button_group_content").actual("height");
			var $lastGroupInTheRow = this.getLastGroupInTheSameRow($currentGroup);
			if(! $currentGroup.is($lastGroupInTheRow) ){
				var $dummySpaceInTheLastGroupInTheRow = $lastGroupInTheRow.children(".dummy_space");
				// without the magic number lower buttons don't align necessarily to the same row next to each other as before the transition.
				var magicMargin = 3;
				$dummySpaceInTheLastGroupInTheRow.css("height", dummyHeight + magicMargin)
				$dummySpaceInTheLastGroupInTheRow.show("slow");
			}
			
			$content.show("slow");
		
			
								
		},
		
		hideButtons: function(event){
			$(".dummy_space").hide("fast");
			this.getGroupContent(event).hide("fast");
		},
		
		getGroupContent: function(event){
			var $eventSrc = $(event.target);
			if($eventSrc.is(".equation_button_group")){
				 return $eventSrc.find(".equation_button_group_content")
			}
			else{
				 return $(".equation_button_group").has($eventSrc).find(".equation_button_group_content");
			}
		},
		
		getLastGroupInTheSameRow: function($currentGroup){
			var positionFromTop = $currentGroup.position().top;
			var buttonGroupContainer = $currentGroup.parent();
			var $lastGroupInTheSameRow;
			
			buttonGroupContainer.children(".equation_button_group").each(function(){
				
				var $loopedGroup = $(this);
				if($loopedGroup.position().top <= positionFromTop){
					$lastGroupInTheSameRow = $loopedGroup;
				}
				else{
					return false;
				}
			
			});
			
			if(!$lastGroupInTheSameRow){
				$lastGroupInTheSameRow = $currentGroup;
			}
			
			return $lastGroupInTheSameRow;
		}
	
	});
	
	var EquationEditorButtonGroupContent = Spine.Controller.sub({
	
		init: function(buttonGroupData){
			this.buttonGroupData = buttonGroupData;
		},
		
		className : "equation_button_group_content",
		
		render : function(){
			for(var i = 1; i < this.buttonGroupData.length; i++){
				var currentButtonData = this.buttonGroupData[i];
				var currentButton = EquationEditorButton.init(currentButtonData);
				this.append(currentButton.render());
				
			}
			
			return this;
		}
	
	});
	
	var DummySpace = Spine.Controller.sub({
		className: "dummy_space"
	
	});
	
	var EquationEditorButton = Spine.Controller.sub({
		
		init: function(equationButtonData){
			this.img_src = equationButtonData.img_src;
			this.alt_text = equationButtonData.latexForm;
			this.className = equationButtonData.className;
			
		},
		
		tag: "button",
		
		events: {"click": "addEquationToTextArea"},
		
		addEquationToTextArea: function(event) {
			var $srcImg;
			if($(event.target).is("img")){
				$srcImg = $(event.target);
			}
			else{
				$srcImg = $("img", event.target);
			}
			
			Dippa.Editor.insert($srcImg.attr("alt"));
		}, 
		
		render : function(){
			this.append(EquationEditorButton.template(this));
			return this;
        }
		 
		
	},{
	
		template : Handlebars.compile($("#equationEditorButton-template").html())
	});
	
	var EquationEditorContent = Spine.Controller.sub({
		el : $('#equationEditorContent'),
		init: function(){},
		render : function(){
			var eeContent = this;
			EquationButtonDataCollection.forEach(function(buttonDataGroup){
				var buttonGroup = EquationEditorButtonGroup.init(buttonDataGroup);
				eeContent.append(buttonGroup.render());
			});
		}
	}).init().render();
	
		
    var EditorView = Spine.Controller.sub({
        activate: function() {
            $('#editor').show();
        },

        deactivate: function() {
            $('#editor').hide();
        }
    });

    var OutputView = Spine.Controller.sub({

        activate: function() {
            $('#console').show();
        },

        deactivate: function() {
            $('#console').hide();
        }
    });

    var FilesView = Spine.Controller.sub({
        activate: function() {
            $('#files').show();
        },

        deactivate: function() {
            $('#files').hide();
        }
    });

    var ControllerStack = Spine.Stack.sub({
        controllers: {
            doc: EditorView,
            output: OutputView,
            files: FilesView
        }
    });

    var Tab = Spine.Controller.sub({
        proxied: ['click'],
        events: {
            'click': 'click'
        }
    });

    var DocumentTab = Tab.sub({
        el: '#tab_doc',
        click: function() {
            Dippa.Editor.changeType('doc');
            this.stack.controllerStack.doc.active();
            this.stack.doc.active();
        }
    });

    var ReferencesTab = Tab.sub({
        el: '#tab_ref',
        click: function() {
            Dippa.Editor.changeType('ref');
            this.stack.controllerStack.doc.active();
            this.stack.ref.active();
        }
    });

    var OutputTab = Tab.sub({
        el: '#tab_out',
        click: function() {
            this.stack.controllerStack.output.active();
            this.stack.output.active();
        }
    });

    var FilesTab = Tab.sub({
        el: '#tab_files',
        click: function() {
            this.stack.controllerStack.files.active();
            this.stack.files.active();
        }
    });

    var TabStack = Spine.Stack.sub({
        el: '#nav',

        controllers: {
            doc: DocumentTab,
            ref: ReferencesTab,
            files: FilesTab,
            output: OutputTab
        },

        'default': 'doc',

        fadeIn: function() {
            this.el.fadeIn('slow');
        },

        fadeOut: function() {
            this.el.fadeOut('slow');
        }
    });

    global.Hero = Hero;
    global.PreviewButton = PreviewButton;
    global.SaveButtonClass = SaveButtonClass;
    global.EditorClass = EditorClass;
    global.FilePreview = FilePreview;
    global.FileItem = FileItem;
    global.Files = Files;
    global.TabStack = TabStack;
    global.ControllerStack = ControllerStack;
    
    
})(Dippa);


