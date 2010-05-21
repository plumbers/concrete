Concrete.UI.Workbench = {

  // Toplevel setup of an editor workbench.
  // Creates editor views and connects event and command handlers.
  // 
  // Options:
  //
  // moduleBrowser: if set to true, add module browser in side pane, default: true
  // moduleBrowserOptions: options passed to the module browser, default: none
  // moduleEditorOptions: options passed to the module editor, default: none
  //
  setup: function(options) {
    options = options || {};

    var layoutManager = new Concrete.UI.LayoutManager();

    var toolbar = new Concrete.UI.Toolbar(layoutManager.toolbar);

    var mp = new Concrete.MetamodelProvider(Metamodel);

    var index = []; 
    var eip = new Concrete.IndexBasedExternalIdentifierProvider(index, mp);

    var editorOptions = options.moduleEditorOptions || {};
    editorOptions.onFollowReference = function(module, ident) {
      jumpReference(module, ident);
    };
    var moduleEditor = new Concrete.UI.ModuleEditor(layoutManager.main, eip, mp, editorOptions);

    var browserOptions = options.moduleBrowserOptions || {};
    browserOptions.onOpenModule = function(module, ident) {
      jumpReference(module, ident);
    };
    var moduleBrowser = new Concrete.UI.ModuleBrowser(layoutManager.sidebar, IndexMetamodel, browserOptions);

    var openElementDialog = new Concrete.UI.OpenElementDialog(eip, {
      onOpenReference: function(module, ident) {
        jumpReference(module, ident);
      }
    });

    var searchReplaceDialog = new Concrete.UI.SearchReplaceDialog({
      metamodelProvider: mp
      });

    // Event Handler

    Event.observe(window, 'click', function(event) {
      moduleEditor.handleEvent(event);
      moduleBrowser.handleEvent(event);
    });
    Event.observe(window, 'dblclick', function(event) {
      moduleBrowser.handleEvent(event);
    });
    Event.observe(window, 'keydown', function(event) {
      if (toolbar.handleEvent(event)) {}
      else {
        moduleEditor.handleEvent(event);
        moduleBrowser.handleEvent(event);
      }
    });
    Event.observe(window, 'mousedown', function(event) {
      layoutManager.handleEvent(event);
    });
    Event.observe(window, 'mouseup', function(event) {
      layoutManager.handleEvent(event);
    });
    Event.observe(window, 'mousemove', function(event) {
      if (layoutManager.handleEvent(event)) {}
      else { 
        moduleEditor.handleEvent(event);
        moduleBrowser.handleEvent(event);
      }
    });

    // Commands

    toolbar.addCommand({buttonClass: "ct_save_button", hotkey: "ctrl+shift+S"}, function() {
      moduleEditor.save({
        onSuccess: function() {
          loadIndex();
        },
        onFailure: function() {
          alert("Save failed");
        }
      });
    });

    toolbar.addCommand({buttonClass: "ct_open_element_button", hotkey: "ctrl+shift+E"}, function() {
      openElementDialog.open(eip.getAllElementInfo());
    });

    toolbar.addCommand({buttonClass: "ct_search_replace_button", hotkey: "ctrl+shift+F"}, function() {
      searchReplaceDialog.open(moduleEditor.editor);
    });

    toolbar.addCommand({buttonClass: "ct_stop_server_button"}, function() {
      new Ajax.Request("/exit");
    });

    function jumpReference(module, ident) {
      var href = "#"+module+((ident && ":"+ident) || "");
      var lastm = window.location.href.match(/#.*/);
      if (href == lastm && lastm[0]) {
        // href doesn't change, call editor anyway to update selection in case it has changed
        moduleEditor.select(module, ident);
      }
      else {
        window.location.href = href; 
      }
    }

    function loadIndex(options) {
      new Ajax.Request("/loadIndex", {
        method: "get",
        onSuccess: function(transport) {
          index.clear();
          var indexJson = transport.responseText.evalJSON(); 
          indexJson.sortBy(function(m) {return m.name}).each(function(m) {
            index.push(m);
          });
          moduleBrowser.loadIndex(index);
          if (options && options.onIndexLoaded) options.onIndexLoaded();
        }
      });
    }

    window.onresize = function() {
      layoutManager.layout();
    };

    window.onhashchange = function() {
      var match = window.location.href.match(/#([^:]+):?(.*)/)
      var module = match && match[1];
      var ident = match && match[2];
      moduleEditor.select(module, ident);
    };

    // first update after loading
    window.onresize();
    loadIndex({onIndexLoaded: function() {
      window.onhashchange();
    }});
  }
};
